'use client';
import { formatMoney } from '@/lib/format';

import React, { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ResetPasswordModal from '@/components/users/ResetPasswordModal';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Edit,
  Package,
  Clock,
  AlertTriangle,
  Wallet,
  FileText,
  Download,
  Save,
  CreditCard,
  Send,
  Building2,
  Receipt,
  FileDown,
  MessageSquare,
  Sparkles,
  Shield,
  Key,
} from 'lucide-react';
function sxToStyle(sx?: any): React.CSSProperties {
  if (!sx) return {};
  const style: any = {};
  for (const [key, val] of Object.entries(sx)) {
    if (key.startsWith('&') || key.startsWith('@')) continue;
    if (typeof val === 'object' && val !== null) {
      const resolved = (val as any).xs ?? (val as any).md ?? (val as any).lg;
      if (resolved !== undefined) style[key] = resolved;
      continue;
    }
    if (key === 'bgcolor') style.backgroundColor = val;
    else if (key === 'p') style.padding = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'px') { style.paddingLeft = typeof val === 'number' ? `${val * 8}px` : val; style.paddingRight = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'py') { style.paddingTop = typeof val === 'number' ? `${val * 8}px` : val; style.paddingBottom = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'pt') style.paddingTop = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pb') style.paddingBottom = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pl') style.paddingLeft = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pr') style.paddingRight = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'm') style.margin = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mx') { style.marginLeft = typeof val === 'number' ? `${val * 8}px` : val; style.marginRight = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'my') { style.marginTop = typeof val === 'number' ? `${val * 8}px` : val; style.marginBottom = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'mt') style.marginTop = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mb') style.marginBottom = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'ml') style.marginLeft = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mr') style.marginRight = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'gap') style.gap = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'borderRadius') style.borderRadius = typeof val === 'number' ? `${val * 8}px` : val;
    else style[key] = val;
  }
  return style;
}

function Box({ children, className = '', component: Component = 'div', sx, style, ...props }: any) {
  return (
    <Component className={className} style={{ ...sxToStyle(sx), ...style }} {...props}>
      {children}
    </Component>
  );
}

function Typography({ children, className = '', component: Component = 'div', variant, color, noWrap, sx, style, ...props }: any) {
  const variantClass = variant === 'caption' ? 'text-xs text-[var(--text-secondary)]' : variant === 'subtitle2' ? 'text-sm font-semibold' : variant === 'body2' ? 'text-sm' : '';
  return (
    <Component className={`${variantClass} ${noWrap ? 'truncate' : ''} ${className}`} style={{ ...sxToStyle(sx), ...style }} {...props}>
      {children}
    </Component>
  );
}

function Tabs({ value, onChange, children, className = '' }: any) {
  return (
    <div className={`flex items-center gap-1 border-b border-[var(--border)] overflow-x-auto ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as any, {
          selected: value === index,
          onClick: () => onChange && onChange(null, index),
        });
      })}
    </div>
  );
}

function Tab({ label, icon, selected, onClick, className = '' }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all duration-150 ${
        selected
          ? 'border-[var(--accent-gold)] text-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.06)]'
          : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
      } ${className}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
  DashboardSurface,
  DashboardPanel,
  DashboardGrid,
} from '@/components/dashboard/DashboardSurface';
import {
  PageHeader,
  Button,
  Breadcrumbs,
  LoadingState,
  EmptyState,
  StatsCard,
  StatusBadge,
  Select,
  toast,
} from '@/components/design-system';
import ShipmentCard from '@/components/dashboard/ShipmentCard';
import NotificationComposer from '@/components/notifications/NotificationComposer';
import { exportToCSVWithHeaders } from '@/lib/export';
import { hasPermission } from '@/lib/rbac';
import { downloadCustomerStatementPDF } from '@/lib/utils/generateCustomerStatementPDF';
import { addWorkspaceItem } from '@/components/dashboard/WorkspaceTray';

interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  role: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  shipments: any[];
  statement?: {
    summary: {
      outstandingAmount: number;
      overdueAmount: number;
      paidAmount: number;
      creditAmount: number;
      openInvoiceCount: number;
      overdueInvoiceCount: number;
      paidInvoiceCount: number;
      availableCredit: number;
      accountBalance: number;
    };
    collections: {
      status: string;
      promiseToPayDate: string | null;
      followUpDate: string | null;
      notes: string | null;
    };
    aging: {
      current: { count: number; amount: number };
      days1to30: { count: number; amount: number };
      days31to60: { count: number; amount: number };
      days61to90: { count: number; amount: number };
      days90plus: { count: number; amount: number };
    };
    timeline: Array<{
      id: string;
      invoiceNumber: string;
      kind: 'INVOICE' | 'SUPPLEMENTAL' | 'CREDIT_NOTE';
      status: string;
      issueDate: string;
      dueDate: string | null;
      paidDate: string | null;
      total: number;
      reference: string | null;
      daysOverdue: number | null;
      paymentMethod: string | null;
      paymentReference: string | null;
    }>;
    generatedAt: string;
  } | null;
}

const invoiceStatusStyles: Record<string, string> = {
  DRAFT: 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)]',
  PENDING: 'border-[rgba(var(--warning-rgb),0.32)] bg-[rgba(var(--warning-rgb),0.12)] text-[var(--warning-dark)]',
  SENT: 'border-[rgba(var(--info-rgb),0.32)] bg-[rgba(var(--info-rgb),0.12)] text-[var(--info-dark)]',
  PAID: 'border-[rgba(var(--success-rgb),0.34)] bg-[rgba(var(--success-rgb),0.12)] text-[var(--success-dark)]',
  OVERDUE: 'border-[rgba(var(--error-rgb),0.34)] bg-[rgba(var(--error-rgb),0.12)] text-[var(--error-dark)]',
};

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function toDateInputValue(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

export default function UserViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(0);

  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [savingCollections, setSavingCollections] = useState(false);
  const [collectionForm, setCollectionForm] = useState({
    status: 'CURRENT',
    promiseToPayDate: '',
    followUpDate: '',
    notes: '',
  });

  useEffect(() => {
    if (tabParam === 'shipments') setActiveTab(1);
    else if (tabParam === 'statement') setActiveTab(2);
    else if (tabParam === 'notifications') setActiveTab(3);
    else if (tabParam === 'overview') setActiveTab(0);
  }, [tabParam]);

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/${id}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        if (data.user) {
          addWorkspaceItem({
            id: data.user.id,
            type: data.user.role === 'customer' ? 'customer' : 'customer',
            title: data.user.name || data.user.email,
            subtitle: `${data.user.role.toUpperCase()} • ${data.user.email}`,
            url: `/dashboard/users/${data.user.id}`,
          });
        }
      } else {
        console.error('Failed to fetch user');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === 'loading') return;
    const canViewCustomers = hasPermission(session?.user?.role, 'customers:view');

    if (!session || (!canViewCustomers && session.user.id !== id)) {
      router.replace('/dashboard');
      return;
    }

    void fetchUser();
  }, [id, session, status, router, fetchUser]);

  useEffect(() => {
    if (!user?.statement?.collections) {
      return;
    }

    setCollectionForm({
      status: user.statement.collections.status,
      promiseToPayDate: toDateInputValue(user.statement.collections.promiseToPayDate),
      followUpDate: toDateInputValue(user.statement.collections.followUpDate),
      notes: user.statement.collections.notes || '',
    });
  }, [user?.statement?.collections]);

  if (loading || status === 'loading') {
    return <LoadingState />;
  }

  if (!user) {
    return (
      <DashboardSurface>
        <EmptyState
          title="User Not Found"
          description="The user you are looking for does not exist or has been removed."
          icon={<User className="w-12 h-12" />}
          action={
            <Link href="/dashboard/users">
              <Button variant="primary">Back to Users</Button>
            </Link>
          }
        />
      </DashboardSurface>
    );
  }

  const isCustomer = user.role === 'user' || user.role === 'customer';
  const backHref = isCustomer ? '/dashboard/customers' : '/dashboard/users';
  const canNotifyCustomer = isCustomer && hasPermission(session?.user?.role, 'customers:view');
  const canManageCollections = isCustomer && (hasPermission(session?.user?.role, 'customers:manage') || hasPermission(session?.user?.role, 'finance:manage'));
  const canManageUsers =
    session?.user?.role === 'admin' ||
    hasPermission(session?.user?.role, 'users:manage') ||
    hasPermission(session?.user?.role, 'customers:manage');
  const statement = user.statement;
  const agingCards = statement
    ? [
        { label: 'Current', value: statement.aging.current },
        { label: '1-30 Days', value: statement.aging.days1to30 },
        { label: '31-60 Days', value: statement.aging.days31to60 },
        { label: '61-90 Days', value: statement.aging.days61to90 },
        { label: '90+ Days', value: statement.aging.days90plus },
      ]
    : [];

  const handleExportStatementCsv = () => {
    if (!statement) {
      return;
    }

    try {
      const rows = statement.timeline.length > 0
        ? statement.timeline.map((invoice) => ({
            invoiceNumber: invoice.invoiceNumber,
            kind: formatLabel(invoice.kind),
            status: formatLabel(invoice.status),
            issueDate: new Date(invoice.issueDate).toLocaleDateString(),
            dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '',
            paidDate: invoice.paidDate ? new Date(invoice.paidDate).toLocaleDateString() : '',
            amount: formatMoney(invoice.total),
            reference: invoice.reference || 'General billing',
            daysOverdue: invoice.daysOverdue ?? 0,
            paymentMethod: invoice.paymentMethod || '',
          }))
        : [{
            invoiceNumber: 'STATEMENT',
            kind: 'Summary',
            status: formatLabel(statement.collections.status),
            issueDate: new Date(statement.generatedAt).toLocaleDateString(),
            dueDate: '',
            paidDate: '',
            amount: formatMoney(statement.summary.outstandingAmount),
            reference: 'No invoice timeline entries yet',
            daysOverdue: 0,
            paymentMethod: '',
          }];

      exportToCSVWithHeaders(
        rows,
        [
          { key: 'invoiceNumber', label: 'Invoice #' },
          { key: 'kind', label: 'Kind' },
          { key: 'status', label: 'Status' },
          { key: 'issueDate', label: 'Issue Date' },
          { key: 'dueDate', label: 'Due Date' },
          { key: 'paidDate', label: 'Paid Date' },
          { key: 'amount', label: 'Amount' },
          { key: 'reference', label: 'Reference' },
          { key: 'daysOverdue', label: 'Days Overdue' },
          { key: 'paymentMethod', label: 'Payment Method' },
        ],
        `${(user.name || user.email).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-statement`
      );
      toast.success('Statement CSV exported');
    } catch (error) {
      console.error('Error exporting statement CSV:', error);
      toast.error('Failed to export statement CSV');
    }
  };

  const handleExportStatementPdf = () => {
    if (!statement) {
      return;
    }

    try {
      downloadCustomerStatementPDF({
        customer: {
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
        summary: statement.summary,
        collections: statement.collections,
        aging: statement.aging,
        timeline: statement.timeline,
        generatedAt: statement.generatedAt,
      });
      toast.success('Statement PDF exported');
    } catch (error) {
      console.error('Error exporting statement PDF:', error);
      toast.error('Failed to export statement PDF');
    }
  };

  const handleSaveCollections = async () => {
    try {
      setSavingCollections(true);
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionStatus: collectionForm.status,
          promiseToPayDate: collectionForm.promiseToPayDate || null,
          followUpDate: collectionForm.followUpDate || null,
          collectionNotes: collectionForm.notes.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to save collections workflow');
      }

      await fetchUser();
      toast.success('Collections workflow updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save collections workflow');
    } finally {
      setSavingCollections(false);
    }
  };

  return (
    <DashboardSurface>
      {/* Standardized Header */}
      <PageHeader
        showBreadcrumbs
        title={user.name || 'User Profile'}
        description={`Account: ${user.email} • Member since ${new Date(user.createdAt).toLocaleDateString()}`}
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href={backHref} style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            </Link>
            {isCustomer && statement && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  icon={<Download className="w-4 h-4" />} 
                  onClick={handleExportStatementCsv}
                >
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  icon={<FileDown className="w-4 h-4" />} 
                  onClick={handleExportStatementPdf}
                >
                  Download Statement
                </Button>
              </>
            )}
            {canManageUsers && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Key className="w-4 h-4" />}
                  onClick={() => setResetPasswordOpen(true)}
                >
                  Reset Password
                </Button>
                <Link href={`/dashboard/users/${id}/edit`} style={{ textDecoration: 'none' }}>
                  <Button variant="primary" size="sm" icon={<Edit className="w-4 h-4" />}>
                    Edit Profile
                  </Button>
                </Link>
              </>
            )}
          </Box>
        }
      />

      {/* Standardized Tab Navigation Bar */}
      <Box
        sx={{
          border: '1px solid var(--border)',
          borderRadius: '14px',
          backgroundColor: 'var(--panel)',
          boxShadow: '0 4px 20px rgba(var(--text-primary-rgb),0.04)',
          overflow: 'hidden',
          mb: 3,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => {
            setActiveTab(newValue);
            const slugs = ['overview', 'shipments', 'statement', 'notifications'];
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.set('tab', slugs[newValue] || slugs[0]);
            router.replace(`?${nextParams.toString()}`, { scroll: false });
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 52,
            '& .MuiTabs-flexContainer': {
              gap: 0.5,
              px: 1,
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 650,
              color: 'var(--text-secondary)',
              minHeight: 52,
              borderRadius: '10px',
              my: 0.5,
              px: 2,
              '&:hover': {
                color: 'var(--accent-gold)',
                backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)',
              },
            },
            '& .Mui-selected': {
              color: 'var(--accent-gold) !important',
              fontWeight: 700,
              backgroundColor: 'rgba(var(--accent-gold-rgb), 0.12)',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'var(--accent-gold)',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab icon={<User className="w-4 h-4" />} iconPosition="start" label="Overview & Profile" />
          <Tab icon={<Package className="w-4 h-4" />} iconPosition="start" label={`Shipments (${user.shipments.length})`} />
          {isCustomer && statement && (
            <Tab icon={<Receipt className="w-4 h-4" />} iconPosition="start" label="Statement & Aging" />
          )}
          {canNotifyCustomer && (
            <Tab icon={<Send className="w-4 h-4" />} iconPosition="start" label="Direct Notifications" />
          )}
        </Tabs>
      </Box>

      {/* TAB 0: Overview & Profile */}
      {activeTab === 0 && (
        <div className="space-y-6">
          {/* KPI Financial Overview for Customers */}
          {isCustomer && statement && (
            <DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                icon={<Wallet className="w-5 h-5 text-[var(--info)]" />}
                title="Outstanding AR"
                value={formatMoney(statement.summary.outstandingAmount)}
                subtitle={`${statement.summary.openInvoiceCount} open invoices`}
                variant="default"
                size="md"
              />
              <StatsCard
                icon={<AlertTriangle className="w-5 h-5 text-[var(--error)]" />}
                title="Overdue Balance"
                value={formatMoney(statement.summary.overdueAmount)}
                subtitle={`${statement.summary.overdueInvoiceCount} overdue invoices`}
                variant="warning"
                size="md"
              />
              <StatsCard
                icon={<Receipt className="w-5 h-5 text-[var(--success-dark)]" />}
                title="Paid Total"
                value={formatMoney(statement.summary.paidAmount)}
                subtitle={`${statement.summary.paidInvoiceCount} settled invoices`}
                variant="success"
                size="md"
              />
              <StatsCard
                icon={<CreditCard className="w-5 h-5 text-[var(--warning-dark)]" />}
                title="Available Credit"
                value={formatMoney(statement.summary.availableCredit)}
                subtitle={`Ledger ${formatMoney(statement.summary.accountBalance)}`}
                variant="info"
                size="md"
              />
            </DashboardGrid>
          )}

          {/* Profile Details & Account Highlights */}
          <DashboardGrid className="grid-cols-1 lg:grid-cols-3">
            {/* User Profile Card */}
            <DashboardPanel title="Profile Details" className="lg:col-span-1">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 2, borderBottom: '1px solid var(--border)' }}>
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[rgba(var(--warning-rgb),0.2)] to-[rgba(var(--warning-rgb),0.1)] border border-[var(--accent-gold)]/30 flex items-center justify-center font-bold text-lg text-[var(--accent-gold)]">
                    {(user.name || user.email).slice(0, 2).toUpperCase()}
                  </div>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight="bold" noWrap>
                      {user.name || 'No Name'}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <StatusBadge
                        status={user.role}
                        label={user.role.toUpperCase()}
                        size="sm"
                      />
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Mail className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary">Email Address</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{user.email}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Phone className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary">Phone</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.phone || 'Not provided'}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Calendar className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary">Registration Date</Typography>
                      <Typography variant="body2">{new Date(user.createdAt).toLocaleDateString()}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Clock className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary">Last Profile Update</Typography>
                      <Typography variant="body2">{new Date(user.updatedAt).toLocaleDateString()}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </DashboardPanel>

            {/* Account Highlights & Summary */}
            <DashboardPanel title="Account Highlights & Activity" className="lg:col-span-2">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Total Shipments</span>
                    <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{user.shipments.length}</p>
                    <span className="text-[10px] text-[var(--text-secondary)]">Active & delivered consignments</span>
                  </div>
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Account Status</span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
                      <span className="text-sm font-bold text-[var(--success-dark)] dark:text-[var(--success)]">Verified Active</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)]">Full operational access</span>
                  </div>
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Collections Status</span>
                    <p className="text-sm font-bold text-[var(--accent-gold)] mt-1">
                      {statement?.collections?.status ? formatLabel(statement.collections.status) : 'Current'}
                    </p>
                    <span className="text-[10px] text-[var(--text-secondary)]">Receivables management</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Quick Actions</h4>
                    <p className="text-xs text-[var(--text-secondary)]">Jump to specific workflow tools for this customer</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setActiveTab(1)} icon={<Package className="w-4 h-4" />}>
                      View Shipments
                    </Button>
                    {isCustomer && (
                      <Button variant="outline" size="sm" onClick={() => setActiveTab(2)} icon={<Receipt className="w-4 h-4" />}>
                        View Statement
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </DashboardPanel>
          </DashboardGrid>
        </div>
      )}

      {/* TAB 1: Shipments Portfolio */}
      {activeTab === 1 && (
        <DashboardPanel
          title={`Shipments Portfolio (${user.shipments.length})`}
          description="History of all vehicle consignments and active bookings"
          fullHeight
        >
          {user.shipments.length > 0 ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
              {user.shipments.map((shipment) => (
                <ShipmentCard key={shipment.id} {...shipment} />
              ))}
            </Box>
          ) : (
            <EmptyState
              icon={<Package className="w-10 h-10" />}
              title="No Shipments Found"
              description="This customer does not have any active or past shipments in the system."
            />
          )}
        </DashboardPanel>
      )}

      {/* TAB 2: Financial Statement & Aging */}
      {activeTab === 2 && isCustomer && statement && (
        <DashboardPanel
          title="Customer Financial Statement & Aging"
          description="Receivables aging schedule, collections tracking, and itemized invoice history"
          actions={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={handleExportStatementCsv}>
                Export CSV
              </Button>
              <Button variant="outline" size="sm" icon={<FileDown className="h-4 w-4" />} onClick={handleExportStatementPdf}>
                Download PDF
              </Button>
              <Link href={`/dashboard/invoices?userId=${user.id}&customer=${encodeURIComponent(user.name || user.email)}`}>
                <Button variant="outline" size="sm" icon={<FileText className="h-4 w-4" />}>
                  View All Invoices
                </Button>
              </Link>
            </Box>
          }
        >
          <div className="space-y-6">
            {/* Aging Schedule */}
            <div>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-secondary)', mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Receivables Aging Schedule
              </Typography>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {agingCards.map((bucket) => (
                  <div key={bucket.label} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{bucket.label}</p>
                    <p className="mt-1.5 text-base font-bold text-[var(--text-primary)]">{formatMoney(bucket.value.amount)}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{bucket.value.count} invoice{bucket.value.count === 1 ? '' : 's'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Collections Workflow Controls */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">Collections Workflow</p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    Track promise-to-pay commitments and next follow-up dates for overdue receivables.
                  </p>
                </div>
                {canManageCollections && (
                  <Button size="sm" icon={<Save className="h-4 w-4" />} onClick={handleSaveCollections} disabled={savingCollections}>
                    {savingCollections ? 'Saving...' : 'Save Collections'}
                  </Button>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Select
                  label="Collection Status"
                  value={collectionForm.status}
                  disabled={!canManageCollections || savingCollections}
                  onChange={(value) => setCollectionForm((current) => ({ ...current, status: String(value) }))}
                  options={['CURRENT', 'FOLLOW_UP', 'PROMISED_TO_PAY', 'IN_COLLECTIONS', 'ESCALATED', 'ON_HOLD'].map((value) => ({
                    value,
                    label: formatLabel(value),
                  }))}
                />

                <label className="block text-sm text-[var(--text-primary)]">
                  <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Promise To Pay Date</span>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                    value={collectionForm.promiseToPayDate}
                    disabled={!canManageCollections || savingCollections}
                    onChange={(event) => setCollectionForm((current) => ({ ...current, promiseToPayDate: event.target.value }))}
                  />
                </label>

                <label className="block text-sm text-[var(--text-primary)]">
                  <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Next Follow-Up Date</span>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                    value={collectionForm.followUpDate}
                    disabled={!canManageCollections || savingCollections}
                    onChange={(event) => setCollectionForm((current) => ({ ...current, followUpDate: event.target.value }))}
                  />
                </label>
              </div>

              <label className="mt-3 block text-sm text-[var(--text-primary)]">
                <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Collections Notes</span>
                <textarea
                  className="min-h-[80px] w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                  value={collectionForm.notes}
                  disabled={!canManageCollections || savingCollections}
                  onChange={(event) => setCollectionForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Promise-to-pay details, callback outcomes, or collection instructions..."
                />
              </label>
            </div>

            {/* Invoice Timeline Table */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">Statement Timeline</p>
                  <p className="text-xs text-[var(--text-secondary)]">Invoices, supplementals, and credit notes history</p>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Updated {new Date(statement.generatedAt).toLocaleString()}
                </p>
              </div>

              {statement.timeline.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)]">
                  <div className="grid grid-cols-12 border-b border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    <div className="col-span-4">Invoice</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-3">Dates</div>
                    <div className="col-span-2">Reference</div>
                    <div className="col-span-1 text-right">Amount</div>
                  </div>
                  <div className="max-h-[24rem] overflow-y-auto divide-y divide-[var(--border)]">
                    {statement.timeline.map((invoice) => (
                      <div key={invoice.id} className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--background)] transition-colors">
                        <div className="col-span-4 min-w-0">
                          <Link href={`/dashboard/invoices/${invoice.id}`} className="inline-flex items-center gap-1.5 font-bold font-mono text-[var(--accent-gold)] hover:underline">
                            <FileText className="h-3.5 w-3.5" />
                            {invoice.invoiceNumber}
                          </Link>
                          <p className="text-xs text-[var(--text-secondary)]">{formatLabel(invoice.kind)}</p>
                        </div>
                        <div className="col-span-2">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${invoiceStatusStyles[invoice.status] || invoiceStatusStyles.DRAFT}`}>
                            {formatLabel(invoice.status)}
                          </span>
                        </div>
                        <div className="col-span-3 text-xs text-[var(--text-secondary)]">
                          <p>Issued {new Date(invoice.issueDate).toLocaleDateString()}</p>
                          {invoice.dueDate && <p className="text-[var(--text-secondary)]">Due {new Date(invoice.dueDate).toLocaleDateString()}</p>}
                        </div>
                        <div className="col-span-2 min-w-0 text-xs text-[var(--text-secondary)] truncate">
                          {invoice.reference || 'General'}
                        </div>
                        <div className={`col-span-1 text-right font-bold text-sm ${invoice.total < 0 ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}`}>
                          {formatMoney(invoice.total)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--panel)] px-6 py-8 text-center">
                  <Wallet className="h-7 w-7 text-[var(--text-secondary)]" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">No invoice history recorded</p>
                </div>
              )}
            </div>
          </div>
        </DashboardPanel>
      )}

      {/* TAB 3: Direct Client Notification */}
      {activeTab === 3 && canNotifyCustomer && (
        <DashboardPanel
          title="Direct Client Notification Studio"
          description="Send instant in-app alerts and notifications directly to this customer"
        >
          <NotificationComposer
            mode="internal-to-customer"
            recipientUserId={user.id}
            recipientName={user.name || user.email}
          />
        </DashboardPanel>
      )}

      {user && (
        <ResetPasswordModal
          open={resetPasswordOpen}
          onClose={() => setResetPasswordOpen(false)}
          userId={user.id}
          userName={user.name}
          userEmail={user.email}
        />
      )}
    </DashboardSurface>
  );
}