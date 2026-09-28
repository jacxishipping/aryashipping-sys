'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Checkbox,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Paper,
} from '@mui/material';
import { 
  ArrowLeft, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  FileText,
  CreditCard,
  ArrowRight,
  Info
} from 'lucide-react';
import { Search } from '@mui/icons-material';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { DataTable } from '@/components/ui/DataTable';
import { Alert, PageHeader, Button, Breadcrumbs, toast, LoadingState, EmptyState, DashboardPageSkeleton, Modal, Select, StatusBadge , FormField } from '@/components/design-system';
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
        <Box sx={{ px: 2, pt: 2 }}>
          <Breadcrumbs />
        </Box>

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
        <Box sx={{ px: 4, py: 3, bgcolor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Box sx={{ px: 2, pb: 4, pt: 3 }}>
          {/* Step 1: Customer Selection */}
          {activeStep === 0 && (
            <DashboardPanel
              title="Step 1: Select Customer"
              description="Choose the customer who made the payment"
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Search field */}
                <FormField
                  placeholder="Search by name or email..."
                  size="small"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    if (selectedUserId) setSelectedUserId('');
                  }} leftIcon={<Search sx={{ mr: 1, color: 'var(--text-secondary)', fontSize: 20 }} />} 
                  fullWidth
                  autoComplete="off"
                />

                {/* Selected customer display */}
                {selectedUserId && (() => {
                  const sel = users.find(u => u.id === selectedUserId);
                  return sel ? (
                    <>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 2,
                          borderRadius: 2,
                          border: '2px solid var(--accent-gold)',
                          bgcolor: 'rgba(var(--accent-gold-rgb),0.08)',
                        }}
                      >
                        <Box>
                          <Box sx={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {sel.name || sel.email}
                          </Box>
                          {sel.name && (
                            <Box sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sel.email}</Box>
                          )}
                        </Box>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedUserId(''); setCustomerSearch(''); }}
                        >
                          Change
                        </Button>
                      </Box>

                      {/* Account balance status */}
                      {loadingBalance ? (
                        <Box sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)', py: 1 }}>Checking account balance...</Box>
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
                    </>
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
                    <Box
                      sx={{
                        border: '1px solid var(--border)',
                        borderRadius: 2,
                        overflow: 'hidden',
                        maxHeight: 280,
                        overflowY: 'auto',
                      }}
                    >
                      {results.length === 0 ? (
                        <Box sx={{ p: 2, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          No customers found
                        </Box>
                      ) : (
                        results.map((user, idx) => (
                          <Box
                            key={user.id}
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setCustomerSearch('');
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              px: 2,
                              py: 1.5,
                              cursor: 'pointer',
                              borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                              bgcolor: 'var(--surface)',
                              '&:hover': { bgcolor: 'rgba(var(--accent-gold-rgb),0.08)' },
                              transition: 'background 0.15s',
                            }}
                          >
                            <User className="w-4 h-4" style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                            <Box>
                              <Box sx={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                {user.name || user.email}
                              </Box>
                              {user.name && (
                                <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{user.email}</Box>
                              )}
                            </Box>
                          </Box>
                        ))
                      )}
                    </Box>
                  );
                })()}

                {selectedUserId && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      onClick={handleNext}
                      variant="primary"
                      icon={<ArrowRight className="w-4 h-4" />}
                      disabled={loadingBalance}
                    >
                      Continue to Shipments
                    </Button>
                  </Box>
                )}
              </Box>
            </DashboardPanel>
          )}

          {/* Step 2: Shipment Selection */}
          {activeStep === 1 && (
            <DashboardPanel
              title="Step 2: Select Vehicle Shipment"
              description={`Choose the shipment and payment category — ${selectedUser?.name || selectedUser?.email}`}
            >
              {loadingShipments ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <LoadingState message="Loading shipments..." />
                </Box>
              ) : shipments.length === 0 ? (
                <EmptyState
                  icon={<AlertCircle className="w-12 h-12" />}
                  title="No Shipments With Outstanding Balance"
                  description="This customer has no shipments with an outstanding balance"
                />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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

                        <FormField
                          placeholder="Enter VIN or Lot Number..."
                          size="small"
                          value={shipmentSearch}
                          onChange={(e) => setShipmentSearch(e.target.value)} leftIcon={<Search sx={{ mr: 1, color: 'var(--text-secondary)', fontSize: 20 }} />} 
                          fullWidth
                          autoComplete="off"
                        />

                        {filtered.length === 0 ? (
                          <Box sx={{ py: 3, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            {q ? 'No shipment matches this VIN or Lot Number for this payment category' : `No shipments have outstanding ${paymentCategoryLabels[paymentCategory].toLowerCase()} balances`}
                          </Box>
                        ) : filtered.map((shipment) => (
                    <Box
                      key={shipment.id}
                      sx={{
                        p: 2.5,
                        border: '2px solid',
                        borderColor: selectedShipmentIds.includes(shipment.id) 
                          ? 'var(--accent-gold)' 
                          : 'var(--border)',
                        borderRadius: 2,
                        bgcolor: selectedShipmentIds.includes(shipment.id) 
                          ? 'rgba(var(--accent-gold-rgb), 0.08)' 
                          : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'var(--accent-gold)',
                          bgcolor: 'rgba(var(--accent-gold-rgb), 0.05)',
                        },
                      }}
                      onClick={() => handleShipmentToggle(shipment.id)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Checkbox
                          checked={selectedShipmentIds.includes(shipment.id)}
                          onChange={() => handleShipmentToggle(shipment.id)}
                          sx={{ 
                            color: 'var(--accent-gold)',
                            '&.Mui-checked': { color: 'var(--accent-gold)' },
                          }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Box sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {shipment.trackingNumber}
                            </Box>
                            <StatusBadge
                              status={shipment.paymentStatus === 'FAILED' ? 'ERROR' : 'WARNING'}
                              label={shipment.paymentStatus}
                              size="sm"
                            />
                          </Box>
                          <Box sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {shipment.vehicleMake} {shipment.vehicleModel}
                          </Box>
                          {shipment.vehicleVIN && (
                            <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                              VIN: {shipment.vehicleVIN}
                            </Box>
                          )}
                          {shipment.lotNumber && (
                            <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                              Lot: {shipment.lotNumber}
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <>
                            <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>
                              {paymentCategoryLabels[paymentCategory]} Due
                            </Box>
                            <Box sx={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                              {formatCurrency(getShipmentDueForCategory(shipment))}
                            </Box>
                            <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                              <Box sx={{ fontSize: '0.72rem', color: paymentCategory === 'PURCHASE_PRICE' ? 'var(--accent-gold)' : 'var(--text-secondary)', fontWeight: paymentCategory === 'PURCHASE_PRICE' ? 700 : 500 }}>
                                Purchase due: {formatCurrency(shipment.purchaseAmountDue || 0)}
                              </Box>
                              <Box sx={{ fontSize: '0.72rem', color: paymentCategory === 'EXPENSES' ? 'var(--accent-gold)' : 'var(--text-secondary)', fontWeight: paymentCategory === 'EXPENSES' ? 700 : 500 }}>
                                Expense due: {formatCurrency(shipment.expenseAmountDue || 0)}
                              </Box>
                              <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                Total shipment due: {formatCurrency(shipment.amountDue || 0)}
                              </Box>
                            </Box>
                          </>
                        </Box>
                      </Box>
                    </Box>
                        ))}
                      </>
                    );
                  })()}

                  {selectedShipmentIds.length > 0 && (
                    <>
                      <Divider sx={{ my: 2, borderColor: 'var(--border)' }} />
                      <Box
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          bgcolor: 'rgba(var(--accent-gold-rgb), 0.12)',
                          border: '2px solid var(--accent-gold)',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Box sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)', mb: 0.5 }}>
                              {paymentCategoryLabels[paymentCategory]} Remaining Due
                            </Box>
                            <Box sx={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              {selectedShipmentIds.length} shipment{selectedShipmentIds.length !== 1 ? 's' : ''} selected
                            </Box>
                          </Box>
                          <Box sx={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                            {formatCurrency(totalSelectedAmount)}
                          </Box>
                        </Box>
                      </Box>
                    </>
                  )}

                  <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
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
                  </Box>
                </Box>
              )}
            </DashboardPanel>
          )}

          {/* Step 3: Payment Details */}
          {activeStep === 2 && (
            <DashboardPanel
              title="Step 3: Enter Payment Details"
              description={`Enter the amount to apply against the shipment's ${paymentCategoryLabels[paymentCategory].toLowerCase()} balance`}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Payment Summary */}
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(var(--accent-gold-rgb), 0.08)',
                    border: '1px solid var(--accent-gold)',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {paymentCategoryLabels[paymentCategory]} Payment Summary
                    </Box>
                    <Box sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {selectedShipmentIds.length} shipment{selectedShipmentIds.length !== 1 ? 's' : ''}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                      {paymentCategoryLabels[paymentCategory]} Outstanding:
                    </Box>
                    <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                      {formatCurrency(totalSelectedAmount)}
                    </Box>
                  </Box>
                  {selectedShipmentIds.length === 1 && (() => {
                    const selectedShipment = shipments.find((shipment) => shipment.id === selectedShipmentIds[0]);
                    if (!selectedShipment) {
                      return null;
                    }

                    return (
                      <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          Purchase due: {formatCurrency(selectedShipment.purchaseAmountDue || 0)}
                        </Box>
                        <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          Expense due: {formatCurrency(selectedShipment.expenseAmountDue || 0)}
                        </Box>
                      </Box>
                    );
                  })()}
                </Box>

                {/* Amount Input */}
                <FormField
                  fullWidth
                  label="Payment Amount (USD) *"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  size="medium" step={'0.01'} min={'0.01'} leftIcon={<DollarSign className="w-5 h-5 text-[var(--text-secondary)]" />} 
                  helperText={`Enter the amount to apply against the shipment's ${paymentCategoryLabels[paymentCategory].toLowerCase()} balance`}
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
                    { value: 'CASH', label: 'Cash', icon: <DollarSign className="w-4 h-4" /> },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: <CreditCard className="w-4 h-4" /> },
                    { value: 'CHECK', label: 'Check', icon: <FileText className="w-4 h-4" /> },
                    { value: 'CREDIT_CARD', label: 'Credit Card', icon: <CreditCard className="w-4 h-4" /> },
                    { value: 'WIRE', label: 'Wire Transfer', icon: <CreditCard className="w-4 h-4" /> },
                  ]}
                />

                {/* Notes */}
                <FormField
                  fullWidth
                  label="Notes (Optional)"
                  multiline
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this payment (e.g., reference number, check number, etc.)"
                  size="medium"
                />

                {/* Navigation */}
                <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
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
                </Box>
              </Box>
            </DashboardPanel>
          )}

          {/* Step 4: Review & Confirm */}
          {activeStep === 3 && (
            <DashboardPanel
              title="Step 4: Review & Confirm"
              description="Review the payment details before submitting"
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Customer Info */}
                <Box>
                  <Box sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', mb: 1 }}>
                    Customer
                  </Box>
                  <Box sx={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedUser?.name || selectedUser?.email}
                  </Box>
                </Box>

                <Divider />

                {/* Payment Details Summary */}
                <Box>
                  <Box sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', mb: 2 }}>
                    Payment Details
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>
                        Payment Amount
                      </Box>
                      <Box sx={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                        {formatCurrency(paymentAmount)}
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>
                        Payment Method
                      </Box>
                      <Box sx={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {paymentMethod.replace('_', ' ')}
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>
                        Payment Category
                      </Box>
                      <Box sx={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-gold)' }}>
                        {paymentCategoryLabels[paymentCategory]}
                      </Box>
                    </Box>
                  </Box>
                </Box>

                <Divider />

                {/* Payment Allocation */}
                <Box>
                  <Box sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', mb: 2 }}>
                    Payment Allocation
                  </Box>
                  
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
                          <Box component="span" sx={{ fontWeight: 600, color: 'var(--accent-gold)' }}>
                            {formatCurrency(value)}
                          </Box>
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
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(var(--accent-gold-rgb), 0.08)', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ fontSize: '0.9rem', fontWeight: 600 }}>Total Payment:</Box>
                      <Box sx={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                        {formatCurrency(paymentAmount)}
                      </Box>
                    </Box>
                  </Box>
                </Box>

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
                  <Box>
                    <Box sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', mb: 1 }}>
                      Notes
                    </Box>
                    <Box sx={{ p: 2, bgcolor: 'var(--surface)', borderRadius: 1, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {notes}
                    </Box>
                  </Box>
                )}

                {/* Navigation */}
                <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
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
                </Box>
              </Box>
            </DashboardPanel>
          )}
        </Box>

        {/* Confirmation Dialog */}
        <Modal
          open={showConfirmDialog}
          onClose={() => !loading && setShowConfirmDialog(false)}
          title="Confirm Payment Recording"
          size="sm"
          actions={
            <>
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
            </>
          }
        >
          <Alert
            severity="info"
            message={
              <>You are about to record a payment of <strong>{formatCurrency(paymentAmount)}</strong> from{' '}<strong>{selectedUser?.name || selectedUser?.email}</strong>.</>
            }
          />
          <Box sx={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            This action will:
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>Create a {paymentCategoryLabels[paymentCategory].toLowerCase()} payment ledger entry</li>
              <li>Update the customer's balance</li>
              <li>Apply payment to the shipment's {paymentCategoryLabels[paymentCategory].toLowerCase()} balance</li>
            </ul>
          </Box>
        </Modal>
      </DashboardSurface>
    </AdminRoute>
  );
}