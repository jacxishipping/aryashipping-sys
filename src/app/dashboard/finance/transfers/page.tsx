'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Building2,
  DollarSign,
  Calendar,
  FileText,
  AlertTriangle,
  ChevronRight,
  Info,
  RotateCcw,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  Button,
  toast,
  StatsCard,
  PageHeader,
  Modal,
} from '@/components/design-system';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { hasPermission } from '@/lib/rbac';
import { formatMoney as formatCurrency } from '@/lib/format';

type TransferType = 'USER_TO_USER' | 'USER_TO_COMPANY' | 'COMPANY_TO_USER' | 'COMPANY_TO_COMPANY';
type TransferStatus = 'COMPLETED' | 'CANCELLED';

interface TransferPartyOption {
  id: string;
  type: 'USER' | 'COMPANY';
  name: string;
  email?: string;
  code?: string | null;
  balance: number;
}

interface LedgerTransferItem {
  id: string;
  transferNumber: string;
  transferType: TransferType;
  amount: number;
  currency: string;
  transferDate: string;
  sourceType: 'USER' | 'COMPANY';
  sourceUserId?: string | null;
  sourceCompanyId?: string | null;
  sourceUser?: { id: string; name: string | null; email: string } | null;
  sourceCompany?: { id: string; name: string; code: string | null } | null;
  destType: 'USER' | 'COMPANY';
  destUserId?: string | null;
  destCompanyId?: string | null;
  destUser?: { id: string; name: string | null; email: string } | null;
  destCompany?: { id: string; name: string; code: string | null } | null;
  reference?: string | null;
  notes?: string | null;
  status: TransferStatus;
  createdById?: string | null;
  createdBy?: { id: string; name: string | null; email: string } | null;
  createdAt: string;
}

interface TransferStats {
  totalAmount: number;
  completedCount: number;
  userToUserCount: number;
  userToCompanyCount: number;
  companyToUserCount: number;
  companyToCompanyCount: number;
}

export default function LedgerTransfersPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [transfers, setTransfers] = useState<LedgerTransferItem[]>([]);
  const [stats, setStats] = useState<TransferStats>({
    totalAmount: 0,
    completedCount: 0,
    userToUserCount: 0,
    userToCompanyCount: 0,
    companyToUserCount: 0,
    companyToCompanyCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Party Options for Transfer
  const [partyOptions, setPartyOptions] = useState<{
    users: TransferPartyOption[];
    companies: TransferPartyOption[];
  }>({ users: [], companies: [] });

  // Modals
  const [isNewTransferOpen, setIsNewTransferOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<LedgerTransferItem | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for New Transfer
  const [formTransferType, setFormTransferType] = useState<TransferType>('USER_TO_USER');
  const [formSourceId, setFormSourceId] = useState('');
  const [formDestId, setFormDestId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formReference, setFormReference] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Fetch transfers
  const fetchTransfers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedType !== 'ALL') params.append('transferType', selectedType);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/finance/transfers?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load transfers');
      const data = await res.json();
      setTransfers(data.transfers || []);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      toast.error('Error', { description: err.message || 'Could not load transfer history' });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedType, selectedStatus, startDate, endDate]);

  // Fetch party options
  const fetchPartyOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/transfers/parties');
      if (res.ok) {
        const data = await res.json();
        setPartyOptions(data);
      }
    } catch (e) {
      console.error('Failed to load transfer parties', e);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
    fetchPartyOptions();
  }, [fetchTransfers, fetchPartyOptions]);

  // Derived options for source/destination based on selected formTransferType
  const sourceOptions = useMemo(() => {
    if (formTransferType === 'USER_TO_USER' || formTransferType === 'USER_TO_COMPANY') {
      return partyOptions.users;
    }
    return partyOptions.companies;
  }, [formTransferType, partyOptions]);

  const destOptions = useMemo(() => {
    if (formTransferType === 'USER_TO_USER' || formTransferType === 'COMPANY_TO_USER') {
      return partyOptions.users.filter((u) => u.id !== formSourceId);
    }
    return partyOptions.companies.filter((c) => c.id !== formSourceId);
  }, [formTransferType, partyOptions, formSourceId]);

  const selectedSourceParty = useMemo(() => {
    return sourceOptions.find((p) => p.id === formSourceId);
  }, [sourceOptions, formSourceId]);

  const selectedDestParty = useMemo(() => {
    return destOptions.find((p) => p.id === formDestId);
  }, [destOptions, formDestId]);

  const numericAmount = parseFloat(formAmount) || 0;

  // Reset form
  const handleOpenNewTransfer = () => {
    setFormTransferType('USER_TO_USER');
    setFormSourceId('');
    setFormDestId('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormReference('');
    setFormNotes('');
    setIsNewTransferOpen(true);
  };

  // Submit transfer
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSourceId || !formDestId) {
      toast.error('Validation Error', { description: 'Please select both source and destination accounts.' });
      return;
    }
    if (numericAmount <= 0) {
      toast.error('Validation Error', { description: 'Transfer amount must be greater than $0.00.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        transferType: formTransferType,
        amount: numericAmount,
        transferDate: formDate,
        reference: formReference.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };

      if (formTransferType === 'USER_TO_USER') {
        payload.sourceUserId = formSourceId;
        payload.destUserId = formDestId;
      } else if (formTransferType === 'USER_TO_COMPANY') {
        payload.sourceUserId = formSourceId;
        payload.destCompanyId = formDestId;
      } else if (formTransferType === 'COMPANY_TO_USER') {
        payload.sourceCompanyId = formSourceId;
        payload.destUserId = formDestId;
      } else if (formTransferType === 'COMPANY_TO_COMPANY') {
        payload.sourceCompanyId = formSourceId;
        payload.destCompanyId = formDestId;
      }

      const res = await fetch('/api/finance/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer failed');

      toast.success('Transfer Successful', {
        description: `Transfer ${data.transfer.transferNumber} of ${formatCurrency(numericAmount)} executed.`,
      });

      setIsNewTransferOpen(false);
      fetchTransfers();
      fetchPartyOptions();
    } catch (err: any) {
      toast.error('Execution Failed', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel/reverse
  const handleConfirmCancel = async () => {
    if (!selectedTransfer) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/finance/transfers/${selectedTransfer.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancel failed');

      toast.success('Transfer Cancelled', {
        description: `Transfer ${selectedTransfer.transferNumber} cancelled and balances recalculated.`,
      });

      setIsCancelConfirmOpen(false);
      setSelectedTransfer(null);
      setCancelReason('');
      fetchTransfers();
      fetchPartyOptions();
    } catch (err: any) {
      toast.error('Cancellation Failed', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeBadge = (type: TransferType) => {
    switch (type) {
      case 'USER_TO_USER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[rgba(var(--info-rgb),0.1)] text-[var(--info)] border border-[rgba(var(--info-rgb),0.2)]">
            <User className="w-3 h-3" /> Customer ➔ Customer
          </span>
        );
      case 'USER_TO_COMPANY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[rgba(var(--success-rgb),0.1)] text-[var(--success)] border border-[rgba(var(--success-rgb),0.2)]">
            <User className="w-3 h-3" /> Customer ➔ 🏢 Company
          </span>
        );
      case 'COMPANY_TO_USER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[rgba(var(--status-violet-rgb),0.1)] text-[var(--status-violet)] border border-[rgba(var(--status-violet-rgb),0.2)]">
            <Building2 className="w-3 h-3" /> Company ➔ 👤 Customer
          </span>
        );
      case 'COMPANY_TO_COMPANY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[rgba(var(--warning-rgb),0.1)] text-[var(--warning)] border border-[rgba(var(--warning-rgb),0.2)]">
            <Building2 className="w-3 h-3" /> Company ➔ Company
          </span>
        );
    }
  };

  const getSourceDisplayName = (t: LedgerTransferItem) => {
    if (t.sourceType === 'USER') {
      return t.sourceUser?.name || t.sourceUser?.email || 'Unknown Customer';
    }
    return t.sourceCompany?.name || 'Unknown Company';
  };

  const getDestDisplayName = (t: LedgerTransferItem) => {
    if (t.destType === 'USER') {
      return t.destUser?.name || t.destUser?.email || 'Unknown Customer';
    }
    return t.destCompany?.name || 'Unknown Company';
  };

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Inter-Ledger Transfers"
          description="Move balances and record atomic double-entry transactions across Customer and Company ledgers"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                icon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
                onClick={() => {
                  fetchTransfers();
                  fetchPartyOptions();
                }}
              >
                Refresh
              </Button>
              {hasPermission(session?.user?.role, 'finance:manage') && (
                <Button
                  variant="primary"
                  icon={<ArrowLeftRight className="w-4 h-4" />}
                  onClick={handleOpenNewTransfer}
                >
                  New Transfer
                </Button>
              )}
            </div>
          }
        />

        {/* KPI Metrics */}
        <DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={<DollarSign className="w-5 h-5" />}
            title="Total Transferred"
            value={formatCurrency(stats.totalAmount)}
            subtitle={`${stats.completedCount} completed transfers`}
            variant="default"
          />
          <StatsCard
            icon={<User className="w-5 h-5" />}
            title="Customer Transfers"
            value={stats.userToUserCount}
            subtitle="Customer-to-Customer balance moves"
            variant="success"
          />
          <StatsCard
            icon={<Building2 className="w-5 h-5" />}
            title="Company Allocations"
            value={stats.userToCompanyCount + stats.companyToUserCount}
            subtitle="Customer ⇄ Company cross-transfers"
            variant="warning"
          />
          <StatsCard
            icon={<ArrowLeftRight className="w-5 h-5" />}
            title="Company-to-Company"
            value={stats.companyToCompanyCount}
            subtitle="Partner settlements & reallocations"
            variant="default"
          />
        </DashboardGrid>

        {/* Filter Toolbar */}
        <DashboardPanel>
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Transfer #, Customer, Company, Ref, or notes..."
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                aria-label="Filter by transfer type"
                className="px-3 py-2 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
              >
                <option value="ALL">All Types</option>
                <option value="USER_TO_USER">Customer ➔ Customer</option>
                <option value="USER_TO_COMPANY">Customer ➔ Company</option>
                <option value="COMPANY_TO_USER">Company ➔ Customer</option>
                <option value="COMPANY_TO_COMPANY">Company ➔ Company</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                aria-label="Filter by transfer status"
                className="px-3 py-2 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Transfer start date filter"
                className="px-2 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
                title="Start Date"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="Transfer end date filter"
                className="px-2 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
                title="End Date"
              />
            </div>
          </div>
        </DashboardPanel>

        {/* Transfers Table */}
        <DashboardPanel noBodyPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Transfer #</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">From (Source)</th>
                  <th className="py-3 px-4">To (Destination)</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent-gold)]" />
                        Loading transfer history...
                      </div>
                    </td>
                  </tr>
                ) : transfers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ArrowLeftRight className="w-8 h-8 text-muted-foreground/40" />
                        <p className="font-medium text-foreground">No ledger transfers found</p>
                        <p className="text-xs">Create your first inter-ledger transfer to move funds seamlessly.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        <div className="flex flex-col">
                          <span>{t.transferNumber}</span>
                          {t.reference && (
                            <span className="text-xs text-muted-foreground">Ref: {t.reference}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">{getTypeBadge(t.transferType)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          {t.sourceType === 'USER' ? (
                            <User className="w-3.5 h-3.5 text-[var(--info)] shrink-0" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
                          )}
                          <span className="truncate max-w-[150px]">{getSourceDisplayName(t)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          {t.destType === 'USER' ? (
                            <User className="w-3.5 h-3.5 text-[var(--info)] shrink-0" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
                          )}
                          <span className="truncate max-w-[150px]">{getDestDisplayName(t)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(t.transferDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {t.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(var(--success-rgb),0.1)] text-[var(--success)]">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(var(--error-rgb),0.1)] text-[var(--error)]">
                            <XCircle className="w-3 h-3" /> Cancelled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedTransfer(t);
                              setIsDetailsOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="View Transfer Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {t.status === 'COMPLETED' &&
                            hasPermission(session?.user?.role, 'finance:manage') && (
                              <button
                                onClick={() => {
                                  setSelectedTransfer(t);
                                  setIsCancelConfirmOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-[rgba(var(--error-rgb),0.3)] text-[var(--error)] hover:bg-[rgba(var(--error-rgb),0.1)] transition-colors"
                                title="Reverse / Cancel Transfer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DashboardPanel>

        {/* Modal: Execute New Transfer */}
        <Modal
          open={isNewTransferOpen}
          onClose={() => setIsNewTransferOpen(false)}
          title="Execute Inter-Ledger Transfer"
          size="lg"
        >
          <form onSubmit={handleExecuteTransfer} className="space-y-4">
            {/* Step 1: Select Type */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">
                1. Select Transfer Flow
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    type: 'USER_TO_USER' as const,
                    label: 'Customer ➔ Customer',
                    desc: 'Transfer funds/credit between clients',
                    icon: User,
                  },
                  {
                    type: 'USER_TO_COMPANY' as const,
                    label: 'Customer ➔ Company',
                    desc: 'Apply customer balance to company account',
                    icon: Building2,
                  },
                  {
                    type: 'COMPANY_TO_USER' as const,
                    label: 'Company ➔ Customer',
                    desc: 'Transfer company credit/payout to client',
                    icon: User,
                  },
                  {
                    type: 'COMPANY_TO_COMPANY' as const,
                    label: 'Company ➔ Company',
                    desc: 'Reallocate balances between partner companies',
                    icon: Building2,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = formTransferType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        setFormTransferType(item.type);
                        setFormSourceId('');
                        setFormDestId('');
                      }}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        isSelected
                          ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)] ring-1 ring-[var(--accent-gold)]'
                          : 'border-border bg-background hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-sm text-foreground mb-1">
                        <Icon className="w-4 h-4 text-[var(--accent-gold)]" />
                        {item.label}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Source & Destination */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  From (Source Account) *
                </label>
                <select
                  required
                  value={formSourceId}
                  onChange={(e) => setFormSourceId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
                >
                  <option value="">Select source account...</option>
                  {sourceOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name} ({opt.type === 'USER' ? opt.email : opt.code || 'Company'}) — Balance: {formatCurrency(opt.balance)}
                    </option>
                  ))}
                </select>
                {selectedSourceParty && (
                  <div className="mt-1 text-xs text-muted-foreground flex items-center justify-between">
                    <span>Current Balance:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(selectedSourceParty.balance)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  To (Destination Account) *
                </label>
                <select
                  required
                  value={formDestId}
                  onChange={(e) => setFormDestId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
                >
                  <option value="">Select destination account...</option>
                  {destOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name} ({opt.type === 'USER' ? opt.email : opt.code || 'Company'}) — Balance: {formatCurrency(opt.balance)}
                    </option>
                  ))}
                </select>
                {selectedDestParty && (
                  <div className="mt-1 text-xs text-muted-foreground flex items-center justify-between">
                    <span>Current Balance:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(selectedDestParty.balance)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Amount, Date, Reference */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Transfer Amount ($ USD) *
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground font-semibold focus:outline-none focus:border-[var(--accent-gold)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Transfer Date *
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Reference # (Optional)
                </label>
                <input
                  type="text"
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                  placeholder="Check #, Wire #, Invoice #"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
                />
              </div>
            </div>

            {/* Notes / Reason */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Reason / Internal Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Explain the reason or agreement behind this transfer..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
              />
            </div>

            {/* Dynamic Ledger Impact Preview */}
            {selectedSourceParty && selectedDestParty && numericAmount > 0 && (
              <div className="p-3.5 rounded-xl border border-[rgba(var(--accent-gold-rgb),0.3)] bg-[rgba(var(--accent-gold-rgb),0.04)] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-gold)]">
                  <Info className="w-3.5 h-3.5" />
                  Projected Double-Entry Impact
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-background border border-border">
                    <div className="font-semibold text-foreground truncate">{selectedSourceParty.name}</div>
                    <div className="text-[var(--error)] font-mono font-medium">DEBIT: +{formatCurrency(numericAmount)}</div>
                    <div className="text-muted-foreground mt-1">
                      New Balance: <span className="font-semibold text-foreground">{formatCurrency(selectedSourceParty.balance + numericAmount)}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border border-border">
                    <div className="font-semibold text-foreground truncate">{selectedDestParty.name}</div>
                    <div className="text-[var(--success)] font-mono font-medium">CREDIT: -{formatCurrency(numericAmount)}</div>
                    <div className="text-muted-foreground mt-1">
                      New Balance: <span className="font-semibold text-foreground">{formatCurrency(selectedDestParty.balance - numericAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsNewTransferOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || numericAmount <= 0 || !formSourceId || !formDestId}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                {isSubmitting ? 'Processing...' : 'Confirm & Execute Transfer'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: View Transfer Details */}
        <Modal
          open={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title={`Transfer Details: ${selectedTransfer?.transferNumber || ''}`}
          size="md"
        >
          {selectedTransfer && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <div className="text-xs text-muted-foreground">Transfer Type</div>
                  <div className="mt-1">{getTypeBadge(selectedTransfer.transferType)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="mt-1 font-semibold text-foreground">
                    {selectedTransfer.status === 'COMPLETED' ? (
                      <span className="text-[var(--success)]">● Completed</span>
                    ) : (
                      <span className="text-[var(--error)]">● Cancelled</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border border-border bg-background">
                  <div className="text-xs text-muted-foreground mb-1">Source Account (Debited)</div>
                  <div className="font-bold text-foreground">{getSourceDisplayName(selectedTransfer)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Type: {selectedTransfer.sourceType}</div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-background">
                  <div className="text-xs text-muted-foreground mb-1">Destination Account (Credited)</div>
                  <div className="font-bold text-foreground">{getDestDisplayName(selectedTransfer)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Type: {selectedTransfer.destType}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40 text-xs">
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <div className="font-bold text-base text-foreground mt-0.5">
                    {formatCurrency(selectedTransfer.amount)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <div className="font-medium text-foreground mt-0.5">
                    {new Date(selectedTransfer.transferDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Initiated By:</span>
                  <div className="font-medium text-foreground mt-0.5 truncate">
                    {selectedTransfer.createdBy?.name || selectedTransfer.createdBy?.email || 'System'}
                  </div>
                </div>
              </div>

              {selectedTransfer.reference && (
                <div>
                  <span className="text-xs text-muted-foreground">Reference / Slip #:</span>
                  <div className="font-mono text-sm text-foreground mt-0.5">{selectedTransfer.reference}</div>
                </div>
              )}

              {selectedTransfer.notes && (
                <div>
                  <span className="text-xs text-muted-foreground">Notes / Description:</span>
                  <div className="text-xs text-foreground bg-background p-2 rounded-lg border border-border mt-0.5">
                    {selectedTransfer.notes}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-border">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal: Confirm Cancel / Reversal */}
        <Modal
          open={isCancelConfirmOpen}
          onClose={() => setIsCancelConfirmOpen(false)}
          title="Cancel & Reverse Ledger Transfer"
          size="sm"
        >
          {selectedTransfer && (
            <div className="space-y-4 text-sm">
              <div className="p-3 rounded-lg bg-[rgba(var(--error-rgb),0.1)] border border-[rgba(var(--error-rgb),0.2)] text-[var(--error)] text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--error)] mt-0.5" />
                <div>
                  Cancelling will remove or reverse the ledger entries and automatically recalculate running balances for both accounts.
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Transfer: <span className="font-mono font-semibold text-foreground">{selectedTransfer.transferNumber}</span>
                <br />
                Amount: <span className="font-semibold text-foreground">{formatCurrency(selectedTransfer.amount)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Reason for Cancellation (Optional)
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Duplicate entry, client requested reversal..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-[var(--error)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsCancelConfirmOpen(false)}>
                  Keep Transfer
                </Button>
                <Button
                  variant="danger"
                  disabled={isSubmitting}
                  onClick={handleConfirmCancel}
                  icon={<RotateCcw className="w-4 h-4" />}
                >
                  {isSubmitting ? 'Reversing...' : 'Confirm Reversal'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </DashboardSurface>
    </ProtectedRoute>
  );
}
