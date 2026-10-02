'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  Package,
  User,
  MapPin,
  Truck,
  Wallet,
  Clock,
} from 'lucide-react';
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
          <div className="text-sm text-[var(--text-secondary)]">Loading shipment detail...</div>
        </DashboardPanel>
      </DashboardSurface>
    );
  }

  if (!data) {
    return (
      <DashboardSurface>
        <DashboardPanel title="Shipment Detail">
          <EmptyState icon={<Package className="w-8 h-8 text-[var(--text-secondary)]" />} title="Shipment unavailable" description="This assigned shipment could not be loaded." />
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
          <Link href={`/portal/${portalId}/shipments`} className="no-underline">
            <Button variant="outline" size="sm">Back to Shipments</Button>
          </Link>
        }
      />
      <DashboardGrid className="grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-4">
          <DashboardPanel title="Shipment Overview" description={data.customerTracking.summary}>
            <div className="grid gap-4">
              <div className="flex justify-between flex-wrap gap-2">
                <span className="font-bold text-[var(--text-primary)]">{data.customerTracking.currentStageLabel}</span>
                <span className="text-sm text-[var(--text-secondary)]">Status: {shipment.status}</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                <div className="h-full bg-[var(--accent-gold)]" style={{ width: `${data.customerTracking.progressPercent}%` }} />
              </div>
              <div className="grid gap-3">
                {data.customerTracking.milestones.map((milestone) => (
                  <div key={milestone.key} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--panel)]">
                    <div className="flex justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[var(--text-primary)]">{milestone.label}</span>
                      <span className={`text-xs capitalize font-bold ${milestone.state === 'complete' ? 'text-[var(--success)]' : milestone.state === 'current' ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'}`}>
                        {milestone.state}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{milestone.description}</p>
                    {milestone.timestamp ? (
                      <p className="text-xs text-[var(--text-secondary)] mt-2">
                        {new Date(milestone.timestamp).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel title="Status History" description="Customer-facing movement updates">
            {data.history.length === 0 ? (
              <EmptyState icon={<Package className="w-8 h-8 text-[var(--text-secondary)]" />} title="No status history" description="No movement updates are available yet." />
            ) : (
              <div className="grid gap-3">
                {data.history.map((item) => (
                  <div key={item.id} className="border border-[var(--border)] rounded-xl p-4">
                    <div className="flex justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[var(--text-primary)]">{item.title}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{new Date(item.occurredAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{item.source}</p>
                    {item.location ? <p className="text-xs text-[var(--text-primary)] mt-2">Location: {item.location}</p> : null}
                    {item.description ? <p className="text-xs text-[var(--text-secondary)] mt-1">{item.description}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>

          {shipment.dispatch?.events && shipment.dispatch.events.length > 0 ? (
            <DashboardPanel title="Dispatch Events" description="Internal dispatch movement updates">
              <div className="grid gap-3">
                {shipment.dispatch.events.map((event) => (
                  <div key={event.id} className="border border-[var(--border)] rounded-xl p-4">
                    <div className="flex justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[var(--text-primary)]">{event.status}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{new Date(event.eventDate).toLocaleString()}</span>
                    </div>
                    {event.location ? (
                      <p className="text-xs text-[var(--text-primary)] mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        {event.location}
                      </p>
                    ) : null}
                    {event.description ? <p className="text-xs text-[var(--text-secondary)] mt-1">{event.description}</p> : null}
                  </div>
                ))}
              </div>
            </DashboardPanel>
          ) : null}

          {shipment.container?.trackingEvents && shipment.container.trackingEvents.length > 0 ? (
            <DashboardPanel title="Container Tracking" description="Container-level tracking events">
              <div className="grid gap-3">
                {shipment.container.trackingEvents.map((event) => (
                  <div key={event.id} className="border border-[var(--border)] rounded-xl p-4 flex gap-3 items-start">
                    <div className="flex flex-col items-center min-w-[48px]">
                      <div className={`w-2.5 h-2.5 rounded-full ${event.completed ? 'bg-[var(--success)]' : 'bg-[var(--accent-gold)]'}`} />
                      <span className="text-[10px] text-[var(--text-secondary)] mt-1 uppercase">
                        {event.completed ? 'Done' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[var(--text-primary)]">{event.status}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{new Date(event.eventDate).toLocaleString()}</span>
                      </div>
                      {event.location ? (
                        <p className="text-xs text-[var(--text-primary)] mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          {event.location}
                        </p>
                      ) : null}
                      {event.description ? <p className="text-xs text-[var(--text-secondary)] mt-1">{event.description}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </DashboardPanel>
          ) : null}

          <DashboardPanel title="Documents" description="Public shipment documents shared to the portal">
            {shipment.documents.length === 0 ? (
              <EmptyState icon={<FileText className="w-8 h-8 text-[var(--text-secondary)]" />} title="No public documents" description="No public documents have been shared for this shipment yet." />
            ) : (
              <div className="grid gap-3">
                {shipment.documents.map((document) => (
                  <div key={document.id} className="border border-[var(--border)] rounded-xl p-4 flex justify-between gap-4 items-center">
                    <div>
                      <div className="font-semibold text-sm text-[var(--text-primary)]">{document.name}</div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {document.category} • {document.description || 'Shared file'}
                      </div>
                    </div>
                    <a href={document.fileUrl} target="_blank" rel="noreferrer" className="no-underline">
                      <Button variant="outline" size="sm">Open</Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>
        </div>

        <div className="grid gap-4">
          <DashboardPanel title="Vehicle Info">
            <div className="grid gap-3 text-sm">
              {(shipment.vehiclePhotos.length > 0 || shipment.arrivalPhotos.length > 0) ? (
                <div className="flex gap-2 flex-wrap">
                  {shipment.vehiclePhotos.slice(0, 3).map((photoUrl, index) => (
                    <a key={`vehicle-${index}`} href={photoUrl} target="_blank" rel="noreferrer">
                      <img src={photoUrl} alt={`Vehicle photo ${index + 1}`} className="w-20 h-20 rounded-lg border border-[var(--border)] object-cover" />
                    </a>
                  ))}
                  {shipment.arrivalPhotos.slice(0, 2).map((photoUrl, index) => (
                    <a key={`arrival-${index}`} href={photoUrl} target="_blank" rel="noreferrer">
                      <img src={photoUrl} alt={`Arrival photo ${index + 1}`} className="w-20 h-20 rounded-lg border border-[var(--border)] object-cover" />
                    </a>
                  ))}
                </div>
              ) : null}
              <div><strong>VIN:</strong> {shipment.vehicleVIN || '—'}</div>
              <div><strong>Color:</strong> {shipment.vehicleColor || '—'}</div>
              <div><strong>Lot:</strong> {shipment.lotNumber || '—'}</div>
              <div><strong>Auction:</strong> {shipment.auctionName || '—'}</div>
              <div><strong>Has Key:</strong> {shipment.hasKey == null ? '—' : shipment.hasKey ? 'Yes' : 'No'}</div>
              <div><strong>Has Title:</strong> {shipment.hasTitle == null ? '—' : shipment.hasTitle ? 'Yes' : 'No'}</div>
            </div>
          </DashboardPanel>

          <DashboardPanel title="Portal Customer">
            {data.assignment.partnerCustomer ? (
              <div className="grid gap-2 text-sm">
                <div className="font-bold text-base text-[var(--text-primary)]">{data.assignment.partnerCustomer.name}</div>
                <div className="text-[var(--text-secondary)]">{data.assignment.partnerCustomer.email || 'No email'}</div>
                <div className="text-[var(--text-secondary)]">{data.assignment.partnerCustomer.phone || 'No phone'}</div>
                <div className="text-xs text-[var(--text-secondary)]">{[data.assignment.partnerCustomer.city, data.assignment.partnerCustomer.country].filter(Boolean).join(', ') || 'No location'}</div>
              </div>
            ) : (
              <div className="grid gap-3 items-center">
                <EmptyState icon={<User className="w-8 h-8 text-[var(--text-secondary)]" />} title="No linked portal customer" description="This shipment has not been linked to one of your portal customers yet." />
                <Link href={`/portal/${portalId}/customers`} className="no-underline">
                  <Button variant="outline" size="sm">Link a Customer</Button>
                </Link>
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel title="Portal Readiness">
            <div className="grid gap-2">
              <div className={`font-bold text-sm ${isReadyForPartnerHandling ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                {isReadyForPartnerHandling ? 'Ready for partner handling' : 'Waiting for customer link'}
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {data.portal.requireCustomerLinkForReady === false
                  ? 'This portal allows shipments to be treated as ready even before a portal customer is linked.'
                  : 'This portal requires a linked portal customer before staff should treat the shipment as ready.'}
              </p>
              {data.assignment.notes ? (
                <div className="grid gap-1 mt-2 text-xs">
                  <span className="font-bold text-[var(--text-primary)]">{noteSourceLabel}</span>
                  <span className="text-[var(--text-secondary)]"><strong>Assignment Notes:</strong> {data.assignment.notes}</span>
                </div>
              ) : data.portal.defaultShipmentNotes ? (
                <div className="grid gap-1 mt-2 text-xs">
                  <span className="font-bold text-[var(--info)]">Portal default is available</span>
                  <span className="text-[var(--text-secondary)]"><strong>Default Portal Notes:</strong> {data.portal.defaultShipmentNotes}</span>
                </div>
              ) : null}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Portal Finance">
            <div className="grid gap-2.5 text-sm">
              <div className="font-bold text-[var(--text-primary)]">Portal-only status</div>
              <PaymentStatusBadge status={data.portalFinance.status} />
              <div><strong>Portal Balance:</strong> {formatCurrency(data.portalFinance.balance)}</div>
              <div><strong>Portal Debits:</strong> {formatCurrency(data.portalFinance.debitAmount)}</div>
              <div><strong>Portal Payments:</strong> {formatCurrency(data.portalFinance.paidAmount)}</div>
              <p className="text-xs text-[var(--text-secondary)]">
                {data.portalFinance.paymentRecordCount} payment record(s) and {data.portalFinance.ledgerEntryCount} ledger entry/entries exist only in the portal and do not change the main shipment payment state.
              </p>
              {data.portalFinance.recentPayments.length > 0 ? (
                <div className="grid gap-2 pt-2">
                  <div className="text-xs tracking-wider uppercase text-[var(--text-secondary)]">Recent Portal Payments</div>
                  {data.portalFinance.recentPayments.slice(0, 3).map((payment) => (
                    <div key={payment.id} className="border border-[var(--border)] rounded-xl p-3 bg-[rgba(var(--success-rgb),0.05)]">
                      <div className="font-bold text-sm text-[var(--text-primary)]">{formatCurrency(payment.amount)}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{new Date(payment.paymentDate).toLocaleDateString()} • {payment.paymentMethod}</div>
                      {payment.reference ? <div className="text-xs text-[var(--text-secondary)]">Ref: {payment.reference}</div> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Route Snapshot">
            <div className="grid gap-3">
              {shipment.dispatch ? (
                <div className="border border-[var(--border)] rounded-xl p-3 bg-[rgba(var(--brand-primary-rgb),0.04)]">
                  <div className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5 mb-1">
                    <Truck className="w-4 h-4 text-[var(--text-secondary)]" />
                    Dispatch: {shipment.dispatch.referenceNumber}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {shipment.dispatch.origin} → {shipment.dispatch.destination}
                  </div>
                  {shipment.dispatch.dispatchDate ? (
                    <div className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Dispatched: {new Date(shipment.dispatch.dispatchDate).toLocaleString()}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {shipment.container ? (
                <div className="border border-[var(--border)] rounded-xl p-3 bg-[rgba(var(--accent-rgb),0.05)]">
                  <div className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5 mb-1">
                    <Package className="w-4 h-4 text-[var(--text-secondary)]" />
                    Container: {shipment.container.containerNumber}
                  </div>
                  {shipment.container.vesselName ? <div className="text-xs text-[var(--text-secondary)]">Vessel: {shipment.container.vesselName} ({shipment.container.voyageNumber || '—'})</div> : null}
                  {shipment.container.trackingNumber ? <div className="text-xs text-[var(--text-secondary)]">Tracking: {shipment.container.trackingNumber}</div> : null}
                  {shipment.container.currentLocation ? (
                    <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {shipment.container.currentLocation}
                    </div>
                  ) : null}
                  {shipment.container.estimatedArrival ? <div className="text-xs text-[var(--text-secondary)]">ETA: {new Date(shipment.container.estimatedArrival).toLocaleDateString()}</div> : null}
                  {shipment.container.actualArrival ? <div className="text-xs text-[var(--text-secondary)]">Arrived: {new Date(shipment.container.actualArrival).toLocaleDateString()}</div> : null}
                </div>
              ) : null}
              {shipment.transit ? (
                <div className="border border-[var(--border)] rounded-xl p-3 bg-[rgba(var(--text-primary-rgb),0.03)]">
                  <div className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5 mb-1">
                    <Wallet className="w-4 h-4 text-[var(--text-secondary)]" />
                    Final Transit
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">{shipment.transit.origin} → {shipment.transit.destination}</div>
                  {shipment.transit.estimatedDelivery ? <div className="text-xs text-[var(--text-secondary)]">Estimated Delivery: {new Date(shipment.transit.estimatedDelivery).toLocaleDateString()}</div> : null}
                  {shipment.transit.actualDelivery ? <div className="text-xs text-[var(--success)] font-semibold">Delivered: {new Date(shipment.transit.actualDelivery).toLocaleDateString()}</div> : null}
                </div>
              ) : null}
            </div>
          </DashboardPanel>

          {(shipment.vehiclePhotos.length > 0 || shipment.arrivalPhotos.length > 0) ? (
            <DashboardPanel title="Photos">
              <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(120px,1fr))]">
                {[...shipment.vehiclePhotos, ...shipment.arrivalPhotos].slice(0, 8).map((photoUrl, index) => (
                  <a key={`${photoUrl}-${index}`} href={photoUrl} target="_blank" rel="noreferrer">
                    <img src={photoUrl} alt={`Shipment photo ${index + 1}`} className="w-full h-[120px] rounded-lg border border-[var(--border)] object-cover" />
                  </a>
                ))}
              </div>
            </DashboardPanel>
          ) : null}
        </div>
      </DashboardGrid>
    </DashboardSurface>
  );
}