'use client';
import { formatMoney } from '@/lib/format';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Clock3, ExternalLink, Search, Undo2 } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, EmptyState, toast } from '@/components/design-system';

type GetpassShipment = {
  id: string;
  vehicleType: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  status: string;
  companyGetpassStartedAt: string;
  companyGetpassCompletedAt: string | null;
  companyGetpassDurationSeconds: number | null;
  shippingCompany: { id: string; name: string } | null;
  container: { id: string; containerNumber: string } | null;
  expenses: {
    shipping: number;
    dispatch: number;
    transit: number;
    total: number;
  };
  companyPayment: {
    charged: number;
    paid: number;
    remaining: number;
    status: 'NOT_DUE' | 'UNPAID' | 'PARTIAL' | 'PAID_TO_COMPANY';
  };
};

function formatElapsedTime(startedAt: string, now: number) {
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatVehicle(shipment: GetpassShipment) {
  return [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || shipment.vehicleType;
}

function companyPaymentLabel(status: GetpassShipment['companyPayment']['status']) {
  if (status === 'PAID_TO_COMPANY') return 'Paid to company';
  if (status === 'PARTIAL') return 'Partially paid';
  if (status === 'UNPAID') return 'Unpaid';
  return 'No payment due';
}

export default function CompanyGetpassesPage() {
  const [shipments, setShipments] = useState<GetpassShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<'active' | 'completed' | 'all'>('active');

  const fetchGetpasses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ state: stateFilter });
      if (search) params.set('search', search);
      const response = await fetch(`/api/company-getpasses?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load Company Getpasses');
      }

      setShipments(data.shipments || []);
    } catch (error) {
      toast.error('Unable to load Company Getpasses', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchGetpasses();
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [search, stateFilter]);

  const handleUndo = async (shipmentId: string) => {
    setUndoingId(shipmentId);

    try {
      const response = await fetch(`/api/shipments/${shipmentId}/company-getpass`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to undo Company Getpass');
      }

      setShipments((currentShipments) => currentShipments.filter((shipment) => shipment.id !== shipmentId));
      toast.success('Company Getpass timer undone');
    } catch (error) {
      toast.error('Unable to undo Company Getpass', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setUndoingId(null);
    }
  };

  const handleComplete = async (shipmentId: string) => {
    setCompletingId(shipmentId);

    try {
      const response = await fetch(`/api/shipments/${shipmentId}/company-getpass`, { method: 'PATCH' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete Company Getpass');
      }

      toast.success('Company Getpass completed');
      await fetchGetpasses();
    } catch (error) {
      toast.error('Unable to complete Company Getpass', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Company Getpasses"
          description="Track active and completed shipment getpasses by company"
        />
        <div className="flex flex-col gap-4">
          <DashboardPanel title="Search & Filter" description="Filter getpasses by vehicle, container, company, or status">
            <form
              className="mb-4 flex flex-col gap-3 md:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchInput.trim());
              }}
            >
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3">
                <Search className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search VIN, vehicle, container, or company"
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                />
              </label>
              <select
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value as 'active' | 'completed' | 'all')}
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)]"
                aria-label="Getpass state"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="all">All getpasses</option>
              </select>
              <Button type="submit" variant="outline" size="sm">Search</Button>
            </form>
            {loading ? (
              <div className="py-10 text-center text-sm text-[var(--text-secondary)]">Loading Company Getpasses...</div>
            ) : shipments.length === 0 ? (
              <EmptyState
                icon={<Clock3 className="h-8 w-8" />}
                title="No Company Getpasses Found"
                description="Try a different search or state filter, or start a getpass from a shipment."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[var(--border)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-3 py-3">Shipment</th>
                      <th className="px-3 py-3">Shipping Company</th>
                      <th className="px-3 py-3">Container</th>
                      <th className="px-3 py-3">Expenses</th>
                      <th className="px-3 py-3">Company Payment</th>
                      <th className="px-3 py-3">Getpass</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map((shipment) => (
                      <tr key={shipment.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-3 py-4">
                          <p className="font-semibold text-[var(--text-primary)]">{formatVehicle(shipment)}</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">VIN: {shipment.vehicleVIN || 'Not recorded'}</p>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-2 text-[var(--text-primary)]">
                            <Building2 className="h-4 w-4 text-[var(--accent-gold)]" />
                            <span>{shipment.shippingCompany?.name || 'Not assigned'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-[var(--text-primary)]">{shipment.container?.containerNumber || 'Not assigned'}</td>
                        <td className="px-3 py-4">
                          <p className="font-semibold text-[var(--text-primary)]">{formatMoney(shipment.expenses.total)}</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            Shipping {formatMoney(shipment.expenses.shipping)} | Dispatch {formatMoney(shipment.expenses.dispatch)} | Transit {formatMoney(shipment.expenses.transit)}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <p className={shipment.companyPayment.status === 'PAID_TO_COMPANY' ? 'font-semibold text-[var(--success-dark)]' : shipment.companyPayment.status === 'PARTIAL' ? 'font-semibold text-[var(--warning)]' : 'font-semibold text-[var(--text-primary)]'}>
                            {companyPaymentLabel(shipment.companyPayment.status)}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            Paid {formatMoney(shipment.companyPayment.paid)} of {formatMoney(shipment.companyPayment.charged)}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <span className="font-mono text-base font-semibold tabular-nums text-[var(--text-primary)]">
                            {shipment.companyGetpassCompletedAt
                              ? formatDuration(shipment.companyGetpassDurationSeconds || 0)
                              : formatElapsedTime(shipment.companyGetpassStartedAt, now)}
                          </span>
                          <p className={shipment.companyGetpassCompletedAt ? 'mt-1 text-xs font-semibold text-[var(--success-dark)]' : 'mt-1 text-xs text-[var(--text-secondary)]'}>
                            {shipment.companyGetpassCompletedAt ? `Completed ${new Date(shipment.companyGetpassCompletedAt).toLocaleDateString()}` : 'Active'}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex justify-end gap-2">
                            <Link href={`/dashboard/shipments/${shipment.id}?tab=company-getpass`}>
                              <Button variant="outline" size="sm" aria-label={`Open ${formatVehicle(shipment)} getpass`}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                            {!shipment.companyGetpassCompletedAt && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => void handleComplete(shipment.id)}
                                  disabled={completingId === shipment.id}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  {completingId === shipment.id ? 'Completing...' : 'Complete'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleUndo(shipment.id)}
                                  disabled={undoingId === shipment.id}
                                >
                                  <Undo2 className="mr-2 h-4 w-4" />
                                  {undoingId === shipment.id ? 'Undoing...' : 'Undo'}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DashboardPanel>
        </div>
      </DashboardSurface>
    </ProtectedRoute>
  );
}