'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { User, UserPlus, Eye, EyeOff, Copy, Check, Download, Users, Package, Mail, Key } from 'lucide-react';
import ResetPasswordModal from '@/components/users/ResetPasswordModal';
import { Box, Typography, IconButton } from '@mui/material';
import { 
  PageHeader, 
  StatsCard, 
  Button, 
  SkeletonCard, 
  CompactSkeleton, 
  toast, 
  CopyButton 
} from '@/components/design-system';
import { exportToCSVWithHeaders } from '@/lib/export';
import { DataTable, Column } from '@/components/ui/DataTable';
import SmartSearch, { SearchFilters } from '@/components/dashboard/SmartSearch';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import UserCard from '@/components/dashboard/UserCard';
import { hasPermission } from '@/lib/rbac';
import { useConfirmAction } from '@/components/ui/ConfirmActionProvider';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt?: string;
  _count?: {
    shipments: number;
  };
}

export default function CustomersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const confirmAction = useConfirmAction();
  const [customers, setCustomers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 9;
  const totalPages = Math.ceil(totalCustomers / PAGE_SIZE) || 1;

  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    type: 'users',
  });
  const [showEmailsFor, setShowEmailsFor] = useState<Set<string>>(new Set());
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserData | null>(null);

  const canManageCustomers = hasPermission(session?.user?.role, 'customers:manage');

  useEffect(() => {
    if (status === 'loading') return;

    const role = session?.user?.role;
    if (!session || !hasPermission(role, 'customers:view')) {
      router.replace('/dashboard');
    }
  }, [session, status, router]);

  const fetchCustomers = useCallback(async (page: number = 1, query: string = searchFilters.query) => {
    try {
      setLoading(true);
      const url = `/api/users?page=${page}&pageSize=${PAGE_SIZE}&roleType=customers${query ? `&query=${encodeURIComponent(query)}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.users || []);
        setTotalCustomers(data.total ?? 0);
        setCurrentPage(data.page ?? page);
      } else {
        toast.error('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Error fetching customers');
    } finally {
      setLoading(false);
    }
  }, [searchFilters.query]);

  useEffect(() => {
    if (status === 'loading') return;
    const role = session?.user?.role;
    if (!session || !hasPermission(role, 'customers:view')) return;
    fetchCustomers(currentPage);
  }, [session, status, currentPage, fetchCustomers]);

  const handleSearch = (filters: SearchFilters) => {
    setSearchFilters(filters);
    setCurrentPage(1);
    fetchCustomers(1, filters.query);
  };

  const formatRole = (role: string) => role.charAt(0).toUpperCase() + role.slice(1);

  const toggleEmailVisibility = (userId: string) => {
    setShowEmailsFor((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const copyToClipboard = async (text: string, userId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmail(userId);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const maskEmail = (email: string) => {
    const [username, domain] = email.split('@');
    if (username.length <= 3) return `${username[0]}***@${domain}`;
    return `${username.substring(0, 3)}***@${domain}`;
  };

  const handleDeleteCustomer = async (userId: string) => {
    if (!canManageCustomers) return;

    if (!(await confirmAction({
      message: 'Are you sure you want to delete this customer account? This action cannot be undone.',
      confirmText: 'Delete Customer',
      severity: 'error',
    }))) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Customer deleted successfully');
        fetchCustomers(currentPage);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Error deleting customer');
    }
  };

  const customerColumns = useMemo<Column<UserData>[]>(() => [
    {
      key: 'name',
      header: 'Customer',
      sortable: true,
      render: (_, row) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }} noWrap>
            {row.name || 'Unnamed Customer'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {formatRole(row.role)}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (_, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: '0.8rem' }} noWrap>
            {showEmailsFor.has(row.id) ? row.email : maskEmail(row.email)}
          </Typography>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleEmailVisibility(row.id); }} title="Toggle email visibility">
            {showEmailsFor.has(row.id) ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
          </IconButton>
          {showEmailsFor.has(row.id) && (
            <span onClick={(e) => e.stopPropagation()}>
              <CopyButton value={row.email} label="Email" />
            </span>
          )}
        </Box>
      ),
    },
    {
      key: 'shipments',
      header: 'Shipments',
      sortable: true,
      render: (_, row) => (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, borderRadius: '999px', bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)', color: 'var(--accent-gold)', fontWeight: 700, fontSize: '0.75rem' }}>
          <Package className="w-3.5 h-3.5" />
          <span>{row._count?.shipments ?? 0}</span>
        </Box>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (_, row) => (
        <Typography variant="caption" color="text.secondary">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'}
        </Typography>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
          <Link href={`/dashboard/users/${row.id}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">
              View Profile
            </Button>
          </Link>
          {canManageCustomers && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={<Key className="w-3.5 h-3.5" />}
                onClick={() => setResetPasswordTarget(row)}
                title="Reset customer password"
              >
                Password
              </Button>
              <Link href={`/dashboard/users/${row.id}/edit`} style={{ textDecoration: 'none' }}>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleDeleteCustomer(row.id)}
                className="text-[var(--error)] hover:bg-[rgba(var(--error-rgb),0.08)] hover:text-[var(--error-dark)]"
              >
                Delete
              </Button>
            </>
          )}
        </Box>
      ),
    },
  ], [showEmailsFor, canManageCustomers]);

  const handleExportCustomerVinCsv = useCallback(async () => {
    try {
      toast.info('Exporting customer VIN data...');
      const firstPageResponse = await fetch('/api/users?page=1&pageSize=100&roleType=customers');
      if (!firstPageResponse.ok) {
        throw new Error('Failed to fetch initial customer export data');
      }

      const firstPageData = await firstPageResponse.json();
      const totalPages = firstPageData.totalPages ?? 1;

      const customerPageResponses = await Promise.all(
        Array.from({ length: totalPages }, (_, index) =>
          fetch(`/api/users?page=${index + 1}&pageSize=100&roleType=customers`)
        )
      );

      const customerPages = await Promise.all(
        customerPageResponses.map(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch customer export data');
          }
          return response.json();
        })
      );

      const customerList = customerPages.flatMap((page) => page.users ?? []);

      const rows = await Promise.all(
        customerList.map(async (customer: UserData) => {
          try {
            const detailResponse = await fetch(`/api/users/${customer.id}`);
            if (!detailResponse.ok) {
              return {
                customerName: customer.name || 'Unnamed Customer',
                shipmentVins: 'N/A',
              };
            }

            const detail = await detailResponse.json();
            const shipmentVins = (detail.user?.shipments ?? [])
              .map((shipment: { vehicleVIN?: string | null }) => shipment.vehicleVIN)
              .filter((vin: string | null | undefined): vin is string => Boolean(vin && vin.trim()))
              .join(' | ');

            return {
              customerName: detail.user?.name || customer.name || 'Unnamed Customer',
              shipmentVins: shipmentVins || 'N/A',
            };
          } catch (error) {
            console.error(`Error exporting customer ${customer.id}:`, error);
            return {
              customerName: customer.name || 'Unnamed Customer',
              shipmentVins: 'N/A',
            };
          }
        })
      );

      exportToCSVWithHeaders(
        rows,
        [
          { key: 'customerName', label: 'Customer Name' },
          { key: 'shipmentVins', label: 'Shipment VINs' },
        ],
        'customers-shipment-vins'
      );

      toast.success(`Exported ${rows.length} customers with VINs`);
    } catch (error) {
      console.error('Export customer VINs failed:', error);
      toast.error('Failed to export customer VIN data');
    }
  }, []);

  if (status === 'loading') {
    return (
      <DashboardSurface>
        <CompactSkeleton />
      </DashboardSurface>
    );
  }

  const role = session?.user?.role;
  if (!session || !hasPermission(role, 'customers:view')) {
    return null;
  }

  return (
    <DashboardSurface>
      {/* Standardized Header */}
      <PageHeader
        showBreadcrumbs
        title="Customers"
        description="All registered client accounts and shipping portfolios"
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => void handleExportCustomerVinCsv()}
              icon={<Download className="w-4 h-4" />}
            >
              Export VINs
            </Button>
            {canManageCustomers && (
              <Link href="/dashboard/customers/new" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />}>
                  Create Customer
                </Button>
              </Link>
            )}
          </Box>
        }
      />

      {/* Summary Stats */}
      <DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          icon={<Users className="w-5 h-5" />}
          title="Total Customers"
          value={totalCustomers}
          variant="default"
          size="md"
        />
        <StatsCard
          icon={<Package className="w-5 h-5" />}
          title="Active Results"
          value={customers.length}
          subtitle={`Page ${currentPage} of ${totalPages || 1}`}
          variant="info"
          size="md"
        />
        <StatsCard
          icon={<Mail className="w-5 h-5" />}
          title="Communication"
          value="Enabled"
          subtitle="Direct customer statement notifications"
          variant="success"
          size="md"
        />
      </DashboardGrid>

      {/* Search Bar */}
      <DashboardPanel title="Search & Filter" description="Find customer accounts instantly">
        <SmartSearch
          onSearch={handleSearch}
          placeholder="Search customers by name or email..."
          showTypeFilter={false}
          showStatusFilter={false}
          showDateFilter
          showPriceFilter={false}
          showUserFilter={false}
          defaultType="users"
        />
      </DashboardPanel>

      {/* Customers Data Panel */}
      <DashboardPanel title={`Customer Directory (${totalCustomers})`} fullHeight>
        {loading ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </Box>
        ) : customers.length === 0 ? (
          <Box sx={{ minHeight: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <User style={{ width: 48, height: 48, color: 'var(--text-secondary)' }} />
            <Typography sx={{ color: 'var(--text-secondary)' }}>No customers found</Typography>
            {canManageCustomers && (
              <Link href="/dashboard/customers/new" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />}>
                  Create Customer
                </Button>
              </Link>
            )}
          </Box>
        ) : (
          <>
            <div className="hidden lg:block">
              <DataTable 
                data={customers} 
                columns={customerColumns} 
                keyField="id" 
                onRowClick={(row) => router.push(`/dashboard/users/${row.id}`)}
              />
            </div>
            <Box sx={{ display: { xs: 'grid', lg: 'none' }, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
              {customers.map((user, index) => (
                <UserCard
                  key={user.id}
                  user={user}
                  index={index}
                  highlighted={false}
                  showEmail={showEmailsFor.has(user.id)}
                  copiedEmail={copiedEmail}
                  onToggleEmail={toggleEmailVisibility}
                  onCopyEmail={copyToClipboard}
                  onDelete={handleDeleteCustomer}
                  onResetPassword={canManageCustomers ? (targetUser) => setResetPasswordTarget(targetUser) : undefined}
                />
              ))}
            </Box>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: '1px solid var(--border)' }}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); fetchCustomers(currentPage - 1, searchFilters.query); }} 
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Page {currentPage} of {totalPages}
                </Typography>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); fetchCustomers(currentPage + 1, searchFilters.query); }} 
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </Box>
            )}
          </>
        )}
      </DashboardPanel>

      {resetPasswordTarget && (
        <ResetPasswordModal
          open={Boolean(resetPasswordTarget)}
          onClose={() => setResetPasswordTarget(null)}
          userId={resetPasswordTarget.id}
          userName={resetPasswordTarget.name}
          userEmail={resetPasswordTarget.email}
          onSuccess={() => fetchCustomers(currentPage)}
        />
      )}
    </DashboardSurface>
  );
}
