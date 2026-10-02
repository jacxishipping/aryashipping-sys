'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  FileText,
  CreditCard,
  ArrowRight,
  Info,
  Search,
  Check
} from 'lucide-react';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { DataTable } from '@/components/ui/DataTable';
import { Alert, PageHeader, Button, Breadcrumbs, toast, LoadingState, EmptyState, DashboardPageSkeleton, Modal, Select, StatusBadge, FormField } from '@/components/design-system';
import AdminRoute from '@/components/auth/AdminRoute';

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Shipment {
  id: string;
  trackingNumber: string;
  lotNumber?: string | null;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVIN?: string | null;
  price?: number;
  purchasePrice?: number | null;
  serviceType?: string;
  amountDue?: number;
  purchaseAmountDue?: number;
  expenseAmountDue?: number;
  paymentStatus: string;
}

interface PaymentAllocation {
  shipmentId: string;
  trackingNumber: string;
  vehicleInfo: string;
  amountDue: number;
  amountToPay: number;
}

type PaymentCategory = 'PURCHASE_PRICE' | 'EXPENSES';

const paymentCategoryLabels: Record<PaymentCategory, string> = {
  PURCHASE_PRICE: 'Car Purchase Price',
  EXPENSES: 'Expenses',
};

const steps = ['Select Customer', 'Choose Shipments', 'Payment Details', 'Review & Submit'];

export default function RecordPaymentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const [customerBalance, setCustomerBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>('PURCHASE_PRICE');
  const [notes, setNotes] = useState('');
  
  // UI state
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [shipmentSearch, setShipmentSearch] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchUsers();
  }, [session, status, router]);

  useEffect(() => {
    if (selectedUserId) {
      setSelectedShipmentIds([]);
      setShipmentSearch('');
      setCustomerBalance(null);
      fetchUserShipments(selectedUserId);
      fetchCustomerBalance(selectedUserId);
    } else {
      setShipments([]);
      setSelectedShipmentIds([]);
      setShipmentSearch('');
      setCustomerBalance(null);
      setActiveStep(0);
    }
  }, [selectedUserId]);

  useEffect(() => {
    setSelectedShipmentIds([]);
    setAmount('');
  }, [paymentCategory]);

  // Auto-fill amount when shipments are selected
  useEffect(() => {
    if (selectedShipmentIds.length > 0 && !amount) {
      const total = calculateTotalSelected();
      setAmount(total.toFixed(2));
    }
  }, [selectedShipmentIds, paymentCategory]);

  const getShipmentDueForCategory = (shipment: Shipment) =>
    paymentCategory === 'PURCHASE_PRICE'
      ? shipment.purchaseAmountDue || 0
      : shipment.expenseAmountDue || 0;

  const fetchUsers = async () => {
    try {
      let allUsers: User[] = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 100;
      while (hasMore) {
        const response = await fetch(`/api/users?page=${page}&pageSize=${pageSize}`);
        if (!response.ok) break;
        const data = await response.json();
        allUsers = [...allUsers, ...(data.users || [])];
        hasMore = allUsers.length < (data.total || 0);
        page++;
      }
      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchCustomerBalance = async (userId: string) => {
    try {
      setLoadingBalance(true);
      const response = await fetch(`/api/ledger?recalc=true&userId=${userId}&limit=1`);
      if (response.ok) {
        const data = await response.json();
        setCustomerBalance(data.summary?.currentBalance ?? 0);
      }
    } catch (error) {
      console.error('Error fetching customer balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchUserShipments = async (userId: string) => {
    try {
      setLoadingShipments(true);
      const response = await fetch(`/api/shipments?userId=${userId}&limit=100&includeFinancial=true`);
      if (response.ok) {
        const data = await response.json();
        const dueShipments = (data.shipments as Shipment[])
          .filter(
            (s) =>
              s.paymentStatus !== 'CANCELLED' &&
              s.paymentStatus !== 'REFUNDED' &&
              (s.amountDue || 0) > 0
          );
        setShipments(dueShipments);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
      toast.error('Failed to load shipments');
    } finally {
      setLoadingShipments(false);
    }
  };

  const handleShipmentToggle = (shipmentId: string) => {
    setSelectedShipmentIds((prev) => {
      const newSelection = prev.includes(shipmentId)
        ? prev.filter((id) => id !== shipmentId)
        : [shipmentId]; // only one shipment at a time
      
      // Auto-fill amount with the outstanding balance for the selected payment category
      if (newSelection.length === 1) {
        const selected = shipments.find(s => s.id === newSelection[0]);
        const outstandingAmount = selected ? getShipmentDueForCategory(selected) : 0;
        if (outstandingAmount > 0) {
          setAmount(outstandingAmount.toFixed(2));
        } else {
          setAmount('');
        }
      } else {
        setAmount('');
      }
      
      return newSelection;
    });
  };

  const calculateTotalSelected = () => {
    const selectedSet = new Set(selectedShipmentIds);
    let total = 0;
    for (const s of shipments) {
      if (selectedSet.has(s.id)) {
        total += getShipmentDueForCategory(s);
      }
    }
    return total;
  };

  const calculatePaymentAllocation = (): PaymentAllocation[] => {
    const paymentAmount = parseFloat(amount) || 0;
    const allocations: PaymentAllocation[] = [];
    let remainingAmount = paymentAmount;

    const selectedShips = shipments.filter(s => selectedShipmentIds.includes(s.id));

    for (const shipment of selectedShips) {
      const amountDue = getShipmentDueForCategory(shipment);
      const amountToPay = Math.min(remainingAmount, amountDue);
      remainingAmount -= amountToPay;
      allocations.push({
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        vehicleInfo: `${shipment.vehicleMake} ${shipment.vehicleModel}`,
        amountDue,
        amountToPay,
      });
    }

    return allocations;
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedUserId) {
      toast.error('Please select a customer');
      return;
    }
    if (activeStep === 1 && selectedShipmentIds.length === 0) {
      toast.error('Please select at least one shipment');
      return;
    }
    if (activeStep === 2) {
      if (!amount || parseFloat(amount) <= 0) {
        toast.error('Please enter a valid payment amount');
        return;
      }
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!selectedUserId || selectedShipmentIds.length === 0 || !amount || parseFloat(amount) <= 0) {
      toast.error('Please complete all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/ledger/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId,
          shipmentIds: selectedShipmentIds,
          amount: parseFloat(amount),
          paymentCategory,
          paymentMethod,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Payment recorded successfully!');
        setShowConfirmDialog(false);
        setTimeout(() => {
          router.push('/dashboard/finance');
        }, 1500);
      } else {
        toast.error(data.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('An error occurred while recording the payment');
    } finally {
      setLoading(false);
    }
  };

  const totalSelectedAmount = calculateTotalSelected();
  const selectedUser = users.find(u => u.id === selectedUserId);
  const paymentAmount = parseFloat(amount) || 0;
  const paymentAllocations = calculatePaymentAllocation();
  const isPartialPayment = paymentAmount < totalSelectedAmount && paymentAmount > 0;

  if (status === 'loading') {
    return (
      <AdminRoute>
        <DashboardPageSkeleton />
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <DashboardSurface>
        <div className="px-2 pt-2">
          <Breadcrumbs />
        </div>

        <PageHeader
          title="Record Shipment Payment"
          description="Record either a car purchase payment or an expense payment for a shipment"
          actions={
            <Link href="/dashboard/finance" style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
                Back to Finance
              </Button>
            </Link>
          }
        />

        {/* Progress Stepper */}
        <div className="px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {steps.map((label, idx) => {
              const isActive = activeStep === idx;
              const isPast = activeStep > idx;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold ${
                    isActive
                      ? 'bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)] border border-[rgba(var(--accent-gold-rgb),0.3)]'
                      : isPast
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] opacity-50'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                      isPast
                        ? 'bg-[var(--success)] text-white'
                        : isActive
                        ? 'bg-[var(--accent-gold)] text-black font-bold'
                        : 'bg-[var(--border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {isPast ? <Check className="w-3 h-3" /> : idx + 1}
                  </div>
                  <span className="truncate">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-2 pb-4 pt-3">
          {/* Step 1: Customer Selection */}
          {activeStep === 0 && (
            <DashboardPanel
              title="Step 1: Select Customer"
              description="Choose the customer who made the payment"
            >
              <div className="space-y-4">
                {/* Search field */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      if (selectedUserId) setSelectedUserId('');
                    }}
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                    autoComplete="off"
                  />
                </div>

                {/* Selected customer display */}
                {selectedUserId && (() => {
                  const sel = users.find(u => u.id === selectedUserId);
                  return sel ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 rounded-xl border-2 border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)]">
                        <div>
                          <div className="font-semibold text-sm text-[var(--text-primary)]">
                            {sel.name || sel.email}
                          </div>
                          {sel.name && (
                            <div className="text-xs text-[var(--text-secondary)]">{sel.email}</div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedUserId(''); setCustomerSearch(''); }}
                        >
                          Change
                        </Button>
                      </div>

                      {/* Account balance status */}
                      {loadingBalance ? (
                        <div className="text-xs text-[var(--text-secondary)] py-1">Checking account balance...</div>
                      ) : customerBalance !== null && (
                        <Alert
                          severity={customerBalance > 0 ? 'warning' : 'info'}
                          message={
                            customerBalance > 0
                              ? `Outstanding balance: ${formatCurrency(customerBalance)} — record payment to reduce the balance.`
                              : customerBalance < 0
                              ? `Customer has ${formatCurrency(-customerBalance)} credit on account.`
                              : `No outstanding balance on this account.`
                          }
                        />
                      )}
                    </div>
                  ) : null;
                })()}

                {/* Search results */}
                {!selectedUserId && customerSearch.trim() && (() => {
                  const q = customerSearch.toLowerCase();
                  const results = users.filter(
                    u =>
                      (u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
                  );
                  return (
                    <div className="border border-[var(--border)] rounded-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-[var(--border)] bg-[var(--background)]">
                      {results.length === 0 ? (
                        <div className="p-4 text-center text-sm text-[var(--text-secondary)]">
                          No customers found
                        </div>
                      ) : (
                        results.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setCustomerSearch('');
                            }}
                            className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-[rgba(var(--accent-gold-rgb),0.08)] transition-colors"
                          >
                            <User className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                            <div>
                              <div className="font-medium text-sm text-[var(--text-primary)]">
                                {user.name || user.email}
                              </div>
                              {user.name && (
                                <div className="text-xs text-[var(--text-secondary)]">{user.email}</div>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  );
                })()}

                {selectedUserId && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={handleNext}
                      variant="primary"
                      icon={<ArrowRight className="w-4 h-4" />}
                      disabled={loadingBalance}
                    >
                      Continue to Shipments
                    </Button>
                  </div>
                )}
              </div>
            </DashboardPanel>
          )}

          {/* Step 2: Shipment Selection */}
          {activeStep === 1 && (
            <DashboardPanel
              title="Step 2: Select Vehicle Shipment"
              description={`Choose the shipment and payment category — ${selectedUser?.name || selectedUser?.email}`}
            >
              {loadingShipments ? (
                <div className="text-center py-8">
                  <LoadingState message="Loading shipments..." />
                </div>
              ) : shipments.length === 0 ? (
                <EmptyState
                  icon={<AlertCircle className="w-12 h-12" />}
                  title="No Shipments With Outstanding Balance"
                  description="This customer has no shipments with an outstanding balance"
                />
              ) : (
                <div className="space-y-4">
                  <Select
                    label="Payment Category"
                    value={paymentCategory}
                    onChange={(value) => setPaymentCategory(value as PaymentCategory)}
                    size="small"
                    required
                    options={Object.entries(paymentCategoryLabels).map(([value, label]) => ({ value, label }))}
                  />

                  {(() => {
                    const q = shipmentSearch.trim().toLowerCase();
                    const filtered = q
                      ? shipments.filter(
                          (s) => {
                            const vin = (s.vehicleVIN || '').toLowerCase();
                            const lot = (s.lotNumber || '').toLowerCase();
                            return (vin.includes(q) || lot.includes(q)) && getShipmentDueForCategory(s) > 0;
                          }
                        )
                      : shipments.filter((shipment) => getShipmentDueForCategory(shipment) > 0);
                    return (
                      <>
                        <Alert
                          severity="info"
                          icon={<Info className="w-5 h-5" />}
                          message={
                            <>Enter VIN or Lot Number to find the vehicle. The list shows shipments with outstanding {paymentCategoryLabels[paymentCategory].toLowerCase()} balances.</>
                          }
                        />

                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                          <input
                            type="text"
                            placeholder="Enter VIN or Lot Number..."
                            value={shipmentSearch}
                            onChange={(e) => setShipmentSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                            autoComplete="off"
                          />
                        </div>

                        {filtered.length === 0 ? (
                          <div className="py-6 text-center text-sm text-[var(--text-secondary)]">
                            {q ? 'No shipment matches this VIN or Lot Number for this payment category' : `No shipments have outstanding ${paymentCategoryLabels[paymentCategory].toLowerCase()} balances`}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {filtered.map((shipment) => {
                              const isSelected = selectedShipmentIds.includes(shipment.id);
                              return (
                                <div
                                  key={shipment.id}
                                  onClick={() => handleShipmentToggle(shipment.id)}
                                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                                    isSelected
                                      ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)]'
                                      : 'border-[var(--border)] hover:border-[var(--accent-gold)] hover:bg-[rgba(var(--accent-gold-rgb),0.04)]'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleShipmentToggle(shipment.id)}
                                    className="w-4 h-4 rounded text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-sm text-[var(--text-primary)]">
                                        {shipment.trackingNumber}
                                      </span>
                                      <StatusBadge
                                        status={shipment.paymentStatus === 'FAILED' ? 'ERROR' : 'WARNING'}
                                        label={shipment.paymentStatus}
                                        size="sm"
                                      />
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)]">
                                      {shipment.vehicleMake} {shipment.vehicleModel}
                                    </div>
                                    {shipment.vehicleVIN && (
                                      <div className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                                        VIN: {shipment.vehicleVIN}
                                      </div>
                                    )}
                                    {shipment.lotNumber && (
                                      <div className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                                        Lot: {shipment.lotNumber}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-[var(--text-secondary)] mb-0.5">
                                      {paymentCategoryLabels[paymentCategory]} Due
                                    </div>
                                    <div className="text-base font-bold text-[var(--accent-gold)]">
                                      {formatCurrency(getShipmentDueForCategory(shipment))}
                                    </div>
                                    <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-[var(--text-secondary)]">
                                      <span className={paymentCategory === 'PURCHASE_PRICE' ? 'text-[var(--accent-gold)] font-bold' : ''}>
                                        Purchase: {formatCurrency(shipment.purchaseAmountDue || 0)}
                                      </span>
                                      <span className={paymentCategory === 'EXPENSES' ? 'text-[var(--accent-gold)] font-bold' : ''}>
                                        Expense: {formatCurrency(shipment.expenseAmountDue || 0)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {selectedShipmentIds.length > 0 && (
                    <div className="mt-4 p-4 rounded-xl bg-[rgba(var(--accent-gold-rgb),0.12)] border-2 border-[var(--accent-gold)] flex justify-between items-center">
                      <div>
                        <div className="text-xs text-[var(--text-secondary)] mb-0.5">
                          {paymentCategoryLabels[paymentCategory]} Remaining Due
                        </div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {selectedShipmentIds.length} shipment{selectedShipmentIds.length !== 1 ? 's' : ''} selected
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-[var(--accent-gold)]">
                        {formatCurrency(totalSelectedAmount)}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2 justify-end">
                    <Button
                      onClick={handleBack}
                      variant="outline"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      variant="primary"
                      disabled={selectedShipmentIds.length === 0}
                      icon={<ArrowRight className="w-4 h-4" />}
                    >
                      Continue to Payment
                    </Button>
                  </div>
                </div>
              )}
            </DashboardPanel>
          )}

          {/* Step 3: Payment Details */}
          {activeStep === 2 && (
            <DashboardPanel
              title="Step 3: Enter Payment Details"
              description={`Enter the amount to apply against the shipment's ${paymentCategoryLabels[paymentCategory].toLowerCase()} balance`}
            >
              <div className="space-y-4">
                {/* Payment Summary */}
                <div className="p-4 rounded-xl bg-[rgba(var(--accent-gold-rgb),0.08)] border border-[var(--accent-gold)]">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      {paymentCategoryLabels[paymentCategory]} Payment Summary
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {selectedShipmentIds.length} shipment{selectedShipmentIds.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-[var(--text-secondary)]">
                      {paymentCategoryLabels[paymentCategory]} Outstanding:
                    </div>
                    <div className="text-xl font-bold text-[var(--accent-gold)]">
                      {formatCurrency(totalSelectedAmount)}
                    </div>
                  </div>
                  {selectedShipmentIds.length === 1 && (() => {
                    const selectedShipment = shipments.find((shipment) => shipment.id === selectedShipmentIds[0]);
                    if (!selectedShipment) return null;
                    return (
                      <div className="mt-2 pt-2 border-t border-[rgba(var(--accent-gold-rgb),0.2)] flex gap-4 text-xs text-[var(--text-secondary)]">
                        <span>Purchase due: <strong className="text-[var(--text-primary)]">{formatCurrency(selectedShipment.purchaseAmountDue || 0)}</strong></span>
                        <span>Expense due: <strong className="text-[var(--text-primary)]">{formatCurrency(selectedShipment.expenseAmountDue || 0)}</strong></span>
                      </div>
                    );
                  })()}
                </div>

                {/* Amount Input */}
                <FormField
                  label="Payment Amount (USD) *"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  hint={`Enter the amount to apply against the shipment's ${paymentCategoryLabels[paymentCategory].toLowerCase()} balance`}
                />

                <Select
                  label="Payment Category"
                  value={paymentCategory}
                  onChange={(value) => setPaymentCategory(value as PaymentCategory)}
                  required
                  options={Object.entries(paymentCategoryLabels).map(([value, label]) => ({ value, label }))}
                />

                {/* Payment Method */}
                <Select
                  label="Payment Method"
                  value={paymentMethod}
                  onChange={(value) => setPaymentMethod(String(value))}
                  required
                  options={[
                    { value: 'CASH', label: 'Cash' },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                    { value: 'CHECK', label: 'Check' },
                    { value: 'CREDIT_CARD', label: 'Credit Card' },
                    { value: 'WIRE', label: 'Wire Transfer' },
                  ]}
                />

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes about this payment (e.g., reference number, check number, etc.)"
                    className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                  />
                </div>

                {/* Navigation */}
                <div className="mt-4 flex gap-2 justify-end pt-2 border-t border-[var(--border)]">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    variant="primary"
                    disabled={!amount || parseFloat(amount) <= 0}
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    Review Payment
                  </Button>
                </div>
              </div>
            </DashboardPanel>
          )}

          {/* Step 4: Review & Confirm */}
          {activeStep === 3 && (
            <DashboardPanel
              title="Step 4: Review & Confirm"
              description="Review the payment details before submitting"
            >
              <div className="space-y-4">
                {/* Customer Info */}
                <div className="border-b border-[var(--border)] pb-3">
                  <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Customer
                  </div>
                  <div className="text-base font-semibold text-[var(--text-primary)]">
                    {selectedUser?.name || selectedUser?.email}
                  </div>
                </div>

                {/* Payment Details Summary */}
                <div className="border-b border-[var(--border)] pb-3">
                  <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Payment Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-[var(--text-secondary)]">Payment Amount</div>
                      <div className="text-lg font-bold text-[var(--accent-gold)] mt-0.5">
                        {formatCurrency(paymentAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-secondary)]">Payment Method</div>
                      <div className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                        {paymentMethod.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-secondary)]">Payment Category</div>
                      <div className="text-sm font-semibold text-[var(--accent-gold)] mt-0.5">
                        {paymentCategoryLabels[paymentCategory]}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Allocation */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Payment Allocation
                  </div>
                  
                  <DataTable
                    data={paymentAllocations}
                    keyField="shipmentId"
                    columns={[
                      { key: 'trackingNumber', header: 'Tracking #' },
                      { key: 'vehicleInfo', header: 'Vehicle' },
                      { key: 'amountDue', header: 'Outstanding Due', align: 'right', render: (value) => formatCurrency(value) },
                      {
                        key: 'amountToPay',
                        header: 'Amount Applied',
                        align: 'right',
                        render: (value) => (
                          <span className="font-bold text-[var(--accent-gold)]">
                            {formatCurrency(value)}
                          </span>
                        ),
                      },
                      {
                        key: 'status',
                        header: 'Status',
                        align: 'right',
                        render: (_value, row) => (
                          <StatusBadge
                            status={row.amountToPay >= row.amountDue ? 'PAID' : 'PARTIAL'}
                            size="sm"
                          />
                        ),
                      },
                    ]}
                  />

                  {/* Summary Row */}
                  <div className="p-3 bg-[rgba(var(--accent-gold-rgb),0.08)] rounded-lg flex justify-between items-center">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">Total Payment:</span>
                    <span className="text-lg font-bold text-[var(--accent-gold)]">
                      {formatCurrency(paymentAmount)}
                    </span>
                  </div>
                </div>

                {/* Info */}
                {isPartialPayment && (
                  <Alert
                    severity="info"
                    icon={<Info className="w-5 h-5" />}
                    message={
                      <><strong>Partial Payment:</strong> This payment will cover {formatCurrency(paymentAmount)} of the total {formatCurrency(totalSelectedAmount)}. The remaining {formatCurrency(totalSelectedAmount - paymentAmount)} will stay pending.</>
                    }
                  />
                )}

                {notes && (
                  <div>
                    <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Notes
                    </div>
                    <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)]">
                      {notes}
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="mt-4 flex gap-2 justify-end pt-2 border-t border-[var(--border)]">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    variant="primary"
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    disabled={loading}
                  >
                    Record Payment
                  </Button>
                </div>
              </div>
            </DashboardPanel>
          )}
        </div>

        {/* Confirmation Dialog */}
        <Modal
          open={showConfirmDialog}
          onClose={() => !loading && setShowConfirmDialog(false)}
          title="Confirm Payment Recording"
          size="sm"
          actions={
            <div className="flex gap-2 justify-end w-full">
              <Button
                onClick={() => setShowConfirmDialog(false)}
                variant="outline"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                variant="primary"
                icon={<CheckCircle2 className="w-4 h-4" />}
                disabled={loading}
              >
                {loading ? 'Recording...' : 'Confirm & Record'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <Alert
              severity="info"
              message={
                <>You are about to record a payment of <strong>{formatCurrency(paymentAmount)}</strong> from{' '}<strong>{selectedUser?.name || selectedUser?.email}</strong>.</>
              }
            />
            <div className="text-xs text-[var(--text-secondary)]">
              This action will:
              <ul className="list-disc pl-5 mt-1.5 space-y-1">
                <li>Create a {paymentCategoryLabels[paymentCategory].toLowerCase()} payment ledger entry</li>
                <li>Update the customer's balance</li>
                <li>Apply payment to the shipment's {paymentCategoryLabels[paymentCategory].toLowerCase()} balance</li>
              </ul>
            </div>
          </div>
        </Modal>
      </DashboardSurface>
    </AdminRoute>
  );
}