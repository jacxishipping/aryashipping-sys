'use client';

import Link from 'next/link';
import { History, MapPin, Truck, Ship, PenLine, FileText } from 'lucide-react';
import { DashboardGrid, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, toast } from '@/components/design-system';
import ShipmentLiveMapPanel from '@/components/shipments/ShipmentLiveMapPanel';
import type { Shipment, StatusColors } from '@/components/shipments/shipment-detail-types';

type ShipmentOverviewTabProps = {
  shipment: Shipment;
  statusStyle: StatusColors;
  containerStatusColors: Record<string, StatusColors>;
  isAdmin: boolean;
  canViewWorkflowCompanyDetails: boolean;
  canAssignDispatch: boolean;
  canManageWorkflow: boolean;
  canManageShipmentRecord: boolean;
  canViewPurchasePrice: boolean;
  isReleasedForTransit: boolean;
  creatingReleaseToken: boolean;
  formatStatus: (status: string) => string;
  onOpenAssignDispatch: () => void;
  onOpenAssignTransit: () => void;
  onGenerateReleaseToken: () => void;
  onRemoveFromDispatch: () => void;
  onRemoveFromTransit: () => void;
};

export default function ShipmentOverviewTab({
  shipment,
  statusStyle,
  containerStatusColors,
  isAdmin,
  canViewWorkflowCompanyDetails,
  canAssignDispatch,
  canManageWorkflow,
  canManageShipmentRecord,
  canViewPurchasePrice,
  isReleasedForTransit,
  creatingReleaseToken,
  formatStatus,
  onOpenAssignDispatch,
  onOpenAssignTransit,
  onGenerateReleaseToken,
  onRemoveFromDispatch,
  onRemoveFromTransit,
}: ShipmentOverviewTabProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Live Location Map */}
      <ShipmentLiveMapPanel shipment={shipment} />

      <DashboardGrid className="grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardPanel title="Current Status" description="Monitor the latest milestone and updates">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: statusStyle.bg,
                color: statusStyle.text,
                border: `1px solid ${statusStyle.border}`,
              }}
            >
              {formatStatus(shipment.status)}
            </span>
            {shipment.container && shipment.container.progress > 0 && (
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Progress <span className="font-semibold text-[var(--text-primary)]">{shipment.container.progress}%</span>
              </span>
            )}
          </div>

          {shipment.container && (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full bg-[var(--accent-gold)] transition-all duration-500"
                  style={{ width: `${Math.max(Math.min(shipment.container.progress || 0, 100), 0)}%` }}
                />
              </div>
              {shipment.container.currentLocation && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <MapPin className="h-4 w-4 text-[var(--accent-gold)]" />
                  <span>
                    Currently at <span className="font-medium text-[var(--text-primary)]">{shipment.container.currentLocation}</span>
                  </span>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Origin</p>
              <p className="font-medium text-[var(--text-primary)]">
                {shipment.container?.loadingPort || shipment.dispatch?.origin || shipment.transit?.origin || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Destination</p>
              <p className="font-medium text-[var(--text-primary)]">
                {shipment.container?.destinationPort || shipment.dispatch?.destination || shipment.transit?.destination || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel
        title="Dispatch To Port"
        description={shipment.dispatch ? `${shipment.dispatch.origin} → ${shipment.dispatch.destination}` : 'Domestic movement before container loading'}
        actions={
          canAssignDispatch ? (
            <button
              onClick={onOpenAssignDispatch}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent-gold)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              <Truck className="h-3.5 w-3.5" />
              Assign to Dispatch
            </button>
          ) : undefined
        }
      >
        {shipment.dispatch ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[var(--accent-gold)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Ref: <strong>{shipment.dispatch.referenceNumber}</strong>
              </span>
              <span
                className="ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase"
                style={{ background: 'rgba(234,179,8,0.15)', color: 'rgb(161,98,7)', border: '1px solid rgba(234,179,8,0.35)' }}
              >
                {shipment.dispatch.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className={`grid gap-2 text-sm ${canViewWorkflowCompanyDetails && shipment.dispatch.company?.name ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {canViewWorkflowCompanyDetails && shipment.dispatch.company?.name ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Company</p>
                  <p className="font-medium">{shipment.dispatch.company.name}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Route</p>
                <p className="font-medium">{shipment.dispatch.origin} → {shipment.dispatch.destination}</p>
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {canViewWorkflowCompanyDetails ? (
                <Link href={`/dashboard/dispatches/${shipment.dispatch.id}`} className="text-xs font-medium text-[var(--accent-gold)] hover:underline">
                  View Dispatch Details →
                </Link>
              ) : null}
              {canManageWorkflow && shipment.status === 'DISPATCHING' && (
                <button onClick={onRemoveFromDispatch} className="ml-auto text-xs text-[var(--error)] hover:underline">
                  Remove from dispatch
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <Truck className="h-8 w-8 text-[var(--text-secondary)] opacity-40" />
            <p className="text-sm text-[var(--text-secondary)]">
              {shipment.containerId || shipment.transitId
                ? 'Dispatch stage is complete for this shipment.'
                : 'No dispatch assigned. Use dispatch to manage the pre-port movement before container handoff.'}
            </p>
          </div>
        )}
      </DashboardPanel>

      <DashboardPanel
        title="Transit to Destination"
        description={shipment.transit ? `${shipment.transit.origin} → ${shipment.transit.destination}` : 'Land delivery from UAE to Afghanistan'}
        actions={
          canManageWorkflow && !shipment.transit ? (
            <div className="flex items-center gap-2">
              {isReleasedForTransit && !shipment.releaseToken && (
                <button
                  onClick={onGenerateReleaseToken}
                  disabled={creatingReleaseToken}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-gold)] disabled:opacity-50"
                >
                  {creatingReleaseToken ? 'Generating...' : 'Generate Release Token'}
                </button>
              )}
              <button
                onClick={onOpenAssignTransit}
                disabled={!isReleasedForTransit}
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent-gold)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Truck className="h-3.5 w-3.5" />
                Assign to Transit
              </button>
            </div>
          ) : undefined
        }
      >
        {shipment.transit ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[var(--accent-gold)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Ref: <strong>{shipment.transit.referenceNumber}</strong>
              </span>
              <span
                className="ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase"
                style={{ background: 'rgba(99,102,241,0.15)', color: 'rgb(99,102,241)', border: '1px solid rgba(99,102,241,0.3)' }}
              >
                {shipment.transit.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className={`grid gap-2 text-sm ${canViewWorkflowCompanyDetails ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {canViewWorkflowCompanyDetails ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Company</p>
                  <p className="font-medium">{shipment.transit.currentCompany?.name || 'No current event company'}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Route</p>
                <p className="font-medium">
                  {shipment.transit.currentEvent?.origin || shipment.transit.origin} → {shipment.transit.currentEvent?.destination || shipment.transit.destination}
                </p>
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {canViewWorkflowCompanyDetails ? (
                <Link href={`/dashboard/transits/${shipment.transit.id}`} className="text-xs font-medium text-[var(--accent-gold)] hover:underline">
                  View Transit Details →
                </Link>
              ) : null}
              {canManageWorkflow && (
                <button onClick={onRemoveFromTransit} className="ml-auto text-xs text-[var(--error)] hover:underline">
                  Remove from transit
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <Truck className="h-8 w-8 text-[var(--text-secondary)] opacity-40" />
            <p className="text-sm text-[var(--text-secondary)]">
              {isReleasedForTransit
                ? 'Shipment is released and ready for transit assignment.'
                : 'No transit assigned. Transit can be assigned only after shipment release.'}
            </p>
            {shipment.releaseToken && (
              <div className="mt-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-left">
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">Release Token</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="text-xs font-semibold text-[var(--text-primary)]">{shipment.releaseToken}</code>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(shipment.releaseToken || '');
                      toast.success('Release token copied');
                    }}
                    className="rounded border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </DashboardPanel>

      <DashboardPanel title="Vehicle Specifications">
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Vehicle</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {`${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || '-'}
            </dd>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">VIN</dt>
            <dd className="mt-1 break-all text-sm font-semibold text-[var(--text-primary)]">{shipment.vehicleVIN || '-'}</dd>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Weight</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.weight ? `${shipment.weight} lbs` : '-'}</dd>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Dimensions</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.dimensions || '-'}</dd>
          </div>
        </dl>
        {shipment.internalNotes && (
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Internal Notes</p>
            <p className="mt-1 text-sm text-[var(--text-primary)]">{shipment.internalNotes}</p>
          </div>
        )}
      </DashboardPanel>

      {shipment.container && (
        <DashboardPanel
          title="Container Shipping Info"
          actions={
            canViewWorkflowCompanyDetails ? (
              <Button href={`/dashboard/containers/${shipment.containerId}`} variant="outline" size="sm">
                View Container
              </Button>
            ) : undefined
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Container Number</p>
                <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">{shipment.container.containerNumber}</p>
              </div>
              {shipment.container.status && (
                <span
                  className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: containerStatusColors[shipment.container.status]?.bg || statusStyle.bg,
                    color: containerStatusColors[shipment.container.status]?.text || statusStyle.text,
                    border: `1px solid ${containerStatusColors[shipment.container.status]?.border || statusStyle.border}`,
                  }}
                >
                  {formatStatus(shipment.container.status)}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Shipping Progress</p>
                <span className="text-sm font-medium text-[var(--text-primary)]">{shipment.container.progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full bg-[var(--accent-gold)] transition-all duration-500"
                  style={{ width: `${Math.max(Math.min(shipment.container.progress || 0, 100), 0)}%` }}
                />
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3">
              {shipment.container.trackingNumber && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Tracking Number</dt>
                  <dd className="mt-1 break-all text-sm font-semibold text-[var(--text-primary)]">{shipment.container.trackingNumber}</dd>
                </div>
              )}
              {shipment.container.vesselName && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Vessel</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.container.vesselName}</dd>
                </div>
              )}
              {canViewWorkflowCompanyDetails && shipment.container.shippingLine && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Shipping Line</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.container.shippingLine}</dd>
                </div>
              )}
              {shipment.container.currentLocation && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Current Location</dt>
                  <dd className="mt-1 flex items-center gap-1 text-sm font-semibold text-[var(--text-primary)]">
                    <MapPin className="h-3 w-3 text-[var(--accent-gold)]" />
                    {shipment.container.currentLocation}
                  </dd>
                </div>
              )}
              {shipment.container.loadingPort && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Loading Port</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.container.loadingPort}</dd>
                </div>
              )}
              {shipment.container.destinationPort && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Destination Port</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.container.destinationPort}</dd>
                </div>
              )}
              {shipment.container.estimatedArrival && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">ETA</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{new Date(shipment.container.estimatedArrival).toLocaleDateString()}</dd>
                </div>
              )}
              {shipment.container.actualArrival && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Actual Arrival</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{new Date(shipment.container.actualArrival).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>

            {shipment.container.trackingEvents && shipment.container.trackingEvents.length > 0 && (
              <div className="mt-6">
                {(() => {
                  const trackingEventCount = shipment.container?.trackingEvents.length || 0;

                  return (
                    <>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  <History className="h-4 w-4" />
                  Container Tracking Timeline ({trackingEventCount} events)
                </h3>
                <div className="space-y-3">
                  {shipment.container.trackingEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className="relative pl-6"
                      style={{
                        borderLeft: index < trackingEventCount - 1 ? '2px solid var(--border)' : 'none',
                        paddingBottom: index < trackingEventCount - 1 ? '12px' : '0',
                      }}
                    >
                      <div
                        className="absolute left-[-9px] top-0 h-4 w-4 rounded-full border-2"
                        style={{
                          backgroundColor: event.completed ? 'var(--success)' : 'var(--accent-gold)',
                          borderColor: 'var(--background)',
                        }}
                      />

                      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{event.status}</p>
                            {event.vesselName && <p className="mt-1 text-xs text-[var(--text-secondary)]">🚢 {event.vesselName}</p>}
                            {event.location && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </p>
                            )}
                            {event.description && <p className="mt-1 text-xs text-[var(--text-secondary)]">{event.description}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-[var(--text-primary)]">{new Date(event.eventDate).toLocaleDateString()}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {new Date(event.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {event.source && <p className="mt-1 text-xs italic text-[var(--text-tertiary)]">Source: {event.source}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </DashboardPanel>
      )}

      <DashboardPanel title="Financial Snapshot">
        <div className="space-y-4">
          {(shipment.damageCost || shipment.damageCredit) && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Damage Accountability</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {isAdmin && shipment.damageCost && (
                  <span className="rounded-full border border-[var(--error)]/35 bg-[var(--error)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--error)]">
                    Charged To Company Ledger
                  </span>
                )}
                {shipment.damageCredit && (
                  <span className="rounded-full border border-[var(--success)]/35 bg-[var(--success)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--success)]">
                    Credited To Customer Invoice/Receipt
                  </span>
                )}
              </div>
            </div>
          )}
          {canViewPurchasePrice && shipment.purchasePrice != null && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Car Purchase Amount</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">${shipment.purchasePrice.toFixed(2)}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Price company paid for the vehicle</p>
            </div>
          )}
          {shipment.price && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Customer Shipping Fare</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">${shipment.price.toFixed(2)}</p>
            </div>
          )}
          {isAdmin && shipment.companyShippingFare && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Company Shipping Cost</p>
              <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">${shipment.companyShippingFare.toFixed(2)}</p>
            </div>
          )}
          {shipment.insuranceValue && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Insurance Value</p>
              <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">${shipment.insuranceValue.toFixed(2)}</p>
            </div>
          )}
          {shipment.damageCredit && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Damage Credit (Discount)</p>
              <p className="mt-1 text-lg font-semibold text-[var(--success)]">-${shipment.damageCredit.toFixed(2)}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Company absorbed damage cost</p>
            </div>
          )}
          {isAdmin && shipment.damageCost && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Damage Cost to Company</p>
              <p className="mt-1 text-lg font-semibold text-[var(--error)]">${shipment.damageCost.toFixed(2)}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Charged to company ledger</p>
            </div>
          )}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Created On</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{new Date(shipment.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel title="Delivery Timeline">
        <div className="space-y-4">
          {shipment.container?.estimatedArrival && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Estimated Arrival</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{new Date(shipment.container.estimatedArrival).toLocaleDateString()}</p>
            </div>
          )}
          {shipment.container?.actualArrival && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Actual Arrival</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{new Date(shipment.container.actualArrival).toLocaleDateString()}</p>
            </div>
          )}
          {shipment.transit?.estimatedDelivery && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Estimated Delivery</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{new Date(shipment.transit.estimatedDelivery).toLocaleDateString()}</p>
            </div>
          )}
          {shipment.transit?.actualDelivery && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Actual Delivery</p>
              <p className="mt-1 text-sm font-semibold text-[var(--success)]">{new Date(shipment.transit.actualDelivery).toLocaleDateString()}</p>
            </div>
          )}
          {!shipment.container && !shipment.transit && (
            <p className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-6 text-center text-sm text-[var(--text-secondary)]">
              Delivery timeline will be available once assigned to a container or transit.
            </p>
          )}
        </div>
      </DashboardPanel>

      <DashboardPanel title="Quick Actions">
        <div className="grid gap-2 sm:grid-cols-2">
          {canManageWorkflow && shipment.container && shipment.container.status !== 'RELEASED' && shipment.container.status !== 'CLOSED' && (
            <Button href={`/dashboard/containers/${shipment.containerId}`} variant="outline" size="sm" className="w-full">
              <Truck className="mr-2 h-4 w-4" />
              View Container Details
            </Button>
          )}
          {canManageWorkflow && shipment.dispatch && (
            <Button href={`/dashboard/dispatches/${shipment.dispatch.id}`} variant="outline" size="sm" className="w-full">
              <Truck className="mr-2 h-4 w-4" />
              View Dispatch Details
            </Button>
          )}
          {canManageWorkflow && shipment.transit && (
            <Button href={`/dashboard/transits/${shipment.transit.id}`} variant="outline" size="sm" className="w-full">
              <Ship className="mr-2 h-4 w-4" />
              View Transit Details
            </Button>
          )}
          {shipment.releaseToken && (
            <button
              onClick={() => {
                void navigator.clipboard.writeText(shipment.releaseToken || '');
                toast.success('Release token copied');
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
            >
              <FileText className="h-3.5 w-3.5" />
              Copy Release Token
            </button>
          )}
          {canManageShipmentRecord && (
            <Button href={`/dashboard/shipments/${shipment.id}/edit`} variant="outline" size="sm" className="w-full">
              <PenLine className="mr-2 h-4 w-4" />
              Edit Shipment
            </Button>
          )}
        </div>
      </DashboardPanel>

      {isAdmin && (
        <DashboardPanel title="Customer Information">
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Name</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.user.name || 'N/A'}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Email</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.user.email}</p>
            </div>
            {shipment.user.phone && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Phone</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.user.phone}</p>
              </div>
            )}
          </div>
        </DashboardPanel>
      )}
    </DashboardGrid>
    </div>
  );
}