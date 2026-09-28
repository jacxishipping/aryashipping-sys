'use client';

import { formatMoney as formatCurrency } from '@/lib/format';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, DollarSign, AlertCircle, CheckCircle, Package } from 'lucide-react';
import { Box } from '@mui/material';
import AdminRoute from '@/components/auth/AdminRoute';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, Breadcrumbs, PageHeader, LoadingState, toast } from '@/components/design-system';

interface Shipment {
  id: string;
  trackingNumber: string;
  vehicleMake?: string;
  vehicleModel?: string;
  userId: string;
  user: {
    name?: string;
    email: string;
  };
}

const expenseTypes = [
  { value: 'SHIPPING_FEE', label: 'Shipping Fee' },
  { value: 'FUEL', label: 'Fuel' },
  { value: 'PORT_CHARGES', label: 'Port Charges' },
  { value: 'TOWING', label: 'Towing' },
  { value: 'CUSTOMS', label: 'Customs' },
  { value: 'OTHER', label: 'Other' },
];

export default function AddExpensePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shipmentIdParam = searchParams.get('shipmentId');

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState(shipmentIdParam || '');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseType, setExpenseType] = useState('SHIPPING_FEE');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'DUE'>('DUE');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingShipments, setLoadingShipments] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchShipments();
  }, [session, status, router]);

  const fetchShipments = async () => {
    try {
      setLoadingShipments(true);
      const response = await fetch('/api/shipments?limit=100');
      if (response.ok) {
        const data = await response.json();
        setShipments(data.shipments || []);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setLoadingShipments(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!selectedShipmentId) {
      setError('Please select a shipment');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/ledger/expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipmentId: selectedShipmentId,
          description,
          amount: parseFloat(amount),
          expenseType,
          paymentMode,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Expense added successfully!');
        setDescription('');
        setAmount('');
        setNotes('');
        setPaymentMode('DUE');
        if (!shipmentIdParam) {
          setSelectedShipmentId('');
        }
        
        // Redirect after 2 seconds
        setTimeout(() => {
          if (shipmentIdParam) {
            router.push(`/dashboard/shipments/${shipmentIdParam}`);
          } else {
            router.push('/dashboard/finance');
          }
        }, 2000);
      } else {
        setError(data.error || 'Failed to add expense');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      setError('An error occurred while adding the expense');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const selectedShipment = shipments.find(s => s.id === selectedShipmentId);

  if (status === 'loading' || loadingShipments) {
    return (
      <AdminRoute>
        <DashboardSurface>
          <Box sx={{ px: 2, pt: 2 }}>
            <Breadcrumbs />
          </Box>
          <LoadingState message="Loading expense form…" />
        </DashboardSurface>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Add Expense"
          description="Add a cost or expense to a shipment"
          actions={
            <Link href={shipmentIdParam ? `/dashboard/shipments/${shipmentIdParam}` : '/dashboard/finance'}>
              <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            </Link>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          {/* Shipment Selection Panel */}
          <DashboardPanel title="Select Shipment" description="Choose the vehicle or shipment to apply this expense to">
            <div>
              <label htmlFor="shipment" className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Shipment <span className="text-[var(--error)]">*</span>
              </label>
              <select
                id="shipment"
                value={selectedShipmentId}
                onChange={(e) => setSelectedShipmentId(e.target.value)}
                disabled={!!shipmentIdParam}
                className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)] text-sm transition-colors"
                required
              >
                <option value="">Select a shipment...</option>
                {shipments.map((shipment) => (
                  <option key={shipment.id} value={shipment.id}>
                    {shipment.trackingNumber} - {shipment.vehicleMake} {shipment.vehicleModel} ({shipment.user.name || shipment.user.email})
                  </option>
                ))}
              </select>
              {shipmentIdParam && (
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Shipment pre-selected from URL
                </p>
              )}
            </div>

            {selectedShipment && (
              <div className="mt-4 p-4 rounded-xl bg-[rgba(var(--info-rgb),0.08)] border border-[rgba(var(--info-rgb),0.25)]">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-[var(--info)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {selectedShipment.trackingNumber}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {selectedShipment.vehicleMake} {selectedShipment.vehicleModel} - {selectedShipment.user.name || selectedShipment.user.email}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DashboardPanel>

          {/* Expense Details Panel */}
          {selectedShipmentId && (
            <DashboardPanel title="Expense Details" description="Define the amount, category, and payment handling mode">
              <div className="space-y-4">
                <div>
                  <label htmlFor="expenseType" className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Expense Type <span className="text-[var(--error)]">*</span>
                  </label>
                  <select
                    id="expenseType"
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)] text-sm transition-colors"
                    required
                  >
                    {expenseTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="description" className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Description <span className="text-[var(--error)]">*</span>
                  </label>
                  <input
                    type="text"
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Port clearance fee at Dubai Port"
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)] text-sm transition-colors"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="amount" className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Amount (USD) <span className="text-[var(--error)]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <DollarSign className="h-4 w-4 text-[var(--text-secondary)]" />
                    </div>
                    <input
                      type="number"
                      id="amount"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)] text-sm transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Payment Mode <span className="text-[var(--error)]">*</span>
                  </label>
                  <div className="flex gap-3">
                    <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${paymentMode === 'DUE' ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.1)]' : 'border-[var(--border)] bg-[var(--background)] hover:border-[rgba(var(--accent-gold-rgb),0.5)]'}`}>
                      <input
                        type="radio"
                        name="paymentMode"
                        value="DUE"
                        checked={paymentMode === 'DUE'}
                        onChange={() => setPaymentMode('DUE')}
                        className="sr-only"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Due</p>
                        <p className="text-xs text-[var(--text-secondary)]">Only DEBIT — customer still owes</p>
                      </div>
                    </label>
                    <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${paymentMode === 'CASH' ? 'border-[var(--success)] bg-[rgba(var(--success-rgb),0.08)]' : 'border-[var(--border)] bg-[var(--background)] hover:border-[rgba(var(--accent-gold-rgb),0.5)]'}`}>
                      <input
                        type="radio"
                        name="paymentMode"
                        value="CASH"
                        checked={paymentMode === 'CASH'}
                        onChange={() => setPaymentMode('CASH')}
                        className="sr-only"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Cash</p>
                        <p className="text-xs text-[var(--text-secondary)]">DEBIT + CREDIT — already paid</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes about this expense..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)] text-sm transition-colors"
                  />
                </div>

                <div className={`p-4 rounded-xl border ${paymentMode === 'CASH' ? 'bg-[rgba(var(--success-rgb),0.08)] border-[rgba(var(--success-rgb),0.25)]' : 'bg-[rgba(var(--warning-rgb),0.08)] border-[rgba(var(--warning-rgb),0.25)]'}`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${paymentMode === 'CASH' ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`} />
                    <div>
                      <p className={`text-sm font-semibold ${paymentMode === 'CASH' ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                        {paymentMode === 'CASH' ? 'Cash Payment' : 'Due Payment'}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        {paymentMode === 'CASH'
                          ? 'Two ledger entries will be created: a DEBIT for the expense and a CREDIT for the cash payment received. Net effect on balance is zero.'
                          : "One ledger entry will be created: a DEBIT for the expense. This will increase the customer's outstanding balance."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </DashboardPanel>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="rounded-xl border border-[rgba(var(--error-rgb),0.3)] bg-[rgba(var(--error-rgb),0.08)] px-4 py-3 text-sm text-[var(--error)]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-[rgba(var(--success-rgb),0.3)] bg-[rgba(var(--success-rgb),0.08)] px-4 py-3 text-sm text-[var(--success)]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {success}
              </div>
            </div>
          )}

          {/* Submit Button */}
          {selectedShipmentId && (
            <div className="flex justify-end gap-3 pt-2">
              <Link href={shipmentIdParam ? `/dashboard/shipments/${shipmentIdParam}` : '/dashboard/finance'}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                >
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
              >
                Add Expense
              </Button>
            </div>
          )}
        </form>
      </DashboardSurface>
    </AdminRoute>
  );
}
