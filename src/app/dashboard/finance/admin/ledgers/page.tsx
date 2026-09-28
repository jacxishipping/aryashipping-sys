'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  People,
  Visibility,
  AttachMoney,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Search,
  FilterList,
  Payment,
} from '@mui/icons-material';
import {  Box, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Chip } from '@mui/material';
import { Button, toast, EmptyState, SkeletonCard, SkeletonTable, Tooltip, StatusBadge, DashboardPageSkeleton, StatsCard, PageHeader } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { hasPermission } from '@/lib/rbac';

interface UserLedgerSummary {
  userId: string;
  userName: string;
  email: string;
  currentBalance: number;
  totalDebit: number;
  totalCredit: number;
  transactionCount: number;
  lastTransaction?: string;
}

export default function AdminLedgersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserLedgerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBalance, setFilterBalance] = useState<'all' | 'positive' | 'zero' | 'negative'>('all');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/auth/signin');
      return;
    }
    if (!hasPermission(session.user?.role, 'finance:manage')) {
      router.replace('/dashboard/finance/ledger');
      return;
    }
    fetchAllUserLedgers();
  }, [session, status, router]);

  const fetchAllUserLedgers = async () => {
    try {
      setLoading(true);
      // Fetch all users by paginating through all pages
      let allUsers: { id: string; name: string | null; email: string }[] = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 100; // Fetch 100 at a time for better performance
      
      while (hasMore) {
        const usersResponse = await fetch(`/api/users?page=${page}&pageSize=${pageSize}`);
        if (!usersResponse.ok) throw new Error('Failed to fetch users');
        
        const usersData = await usersResponse.json();
        allUsers = [...allUsers, ...usersData.users];
        
        // Check if we've fetched all users
        hasMore = allUsers.length < usersData.total;
        page++;
      }
      
      // Fetch ledger summaries in bulk to avoid N+1 API calls
      let summaryMap: Record<string, any> = {};
      try {
        const summaryResponse = await fetch('/api/ledger/summary');
        if (summaryResponse.ok) {
          const data = await summaryResponse.json();
          summaryMap = data.summaries || {};
        } else {
          console.error('Failed to fetch ledger summaries:', await summaryResponse.text());
        }
      } catch (error) {
        console.error('Error fetching ledger summaries:', error);
      }

      const userSummaries = allUsers.map((user: { id: string; name: string | null; email: string }) => {
        const summary = summaryMap[user.id];

        return {
          userId: user.id,
          userName: user.name || user.email,
          email: user.email,
          currentBalance: summary?.currentBalance || 0,
          totalDebit: summary?.totalDebit || 0,
          totalCredit: summary?.totalCredit || 0,
          transactionCount: summary?.transactionCount || 0,
          lastTransaction: summary?.lastTransaction || undefined,
        };
      });

      setUsers(userSummaries);
    } catch (error) {
      console.error('Error fetching user ledgers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No transactions';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBalanceChip = (balance: number) => {
    if (balance > 0) {
      return (
        <Chip
          label={formatCurrency(balance)}
          size="small"
          icon={<TrendingUpIcon />}
          sx={{
            backgroundColor: 'rgba(var(--error-rgb), 0.1)',
            color: 'var(--error)',
            fontWeight: 600,
            fontSize: '0.8rem',
          }}
        />
      );
    }
    if (balance < 0) {
      return (
        <Chip
          label={formatCurrency(Math.abs(balance))}
          size="small"
          icon={<TrendingDownIcon />}
          sx={{
            backgroundColor: 'rgba(var(--success-rgb), 0.1)',
            color: 'var(--success)',
            fontWeight: 600,
            fontSize: '0.8rem',
          }}
        />
      );
    }
    return (
      <Chip
        label={formatCurrency(0)}
        size="small"
        sx={{
          backgroundColor: 'rgba(var(--text-secondary-rgb), 0.1)',
          color: 'var(--text-secondary)',
          fontWeight: 600,
          fontSize: '0.8rem',
        }}
      />
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBalance = 
      filterBalance === 'all' ||
      (filterBalance === 'positive' && user.currentBalance > 0) ||
      (filterBalance === 'zero' && user.currentBalance === 0) ||
      (filterBalance === 'negative' && user.currentBalance < 0);

    return matchesSearch && matchesBalance;
  });

  // ⚡ Bolt: Consolidated multiple array iterations into a single O(N) loop
  let totalBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  let usersWithBalance = 0;

  for (const user of users) {
    totalBalance += user.currentBalance;
    totalDebit += user.totalDebit;
    totalCredit += user.totalCredit;
    if (user.currentBalance > 0) {
      usersWithBalance++;
    }
  }

  const columns = useMemo<Column<UserLedgerSummary>[]>(() => [
    {
      key: 'userName',
      header: 'User',
      sortable: true,
      render: (_, row) => (
        <Box>
          <Typography sx={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
            {row.userName}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {row.email}
          </Typography>
        </Box>
      )
    },
    {
      key: 'currentBalance',
      header: 'Balance',
      sortable: true,
      align: 'center' as const,
      render: (_, row) => getBalanceChip(row.currentBalance)
    },
    {
      key: 'totalDebit',
      header: 'Total Debit',
      sortable: true,
      align: 'right' as const,
      render: (_, row) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
          {formatCurrency(row.totalDebit)}
        </span>
      )
    },
    {
      key: 'totalCredit',
      header: 'Total Credit',
      sortable: true,
      align: 'right' as const,
      render: (_, row) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>
          {formatCurrency(row.totalCredit)}
        </span>
      )
    },
    {
      key: 'transactionCount',
      header: 'Transactions',
      sortable: true,
      align: 'center' as const,
      render: (_, row) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
          {row.transactionCount}
        </span>
      )
    },
    {
      key: 'lastTransaction',
      header: 'Last Activity',
      sortable: true,
      render: (_, row) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {formatDate(row.lastTransaction)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      render: (_, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
          <Link href={`/dashboard/finance/admin/ledgers/${row.userId}`} style={{ textDecoration: 'none' }}>
            <Button
              variant="outline"
              size="sm"
              icon={<Visibility />}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              View Ledger
            </Button>
          </Link>
        </Box>
      )
    }
  ], []);

  if (status === 'loading' || loading) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
          <PageHeader
            showBreadcrumbs
            title="User Ledgers"
            description="Review every customer ledger balance and drill into transaction history"
          />
          <DashboardPageSkeleton />
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="User Ledgers"
          description="Review every customer ledger balance and drill into transaction history"
          meta={[
            { label: 'Outstanding', value: formatCurrency(totalBalance), helper: `${usersWithBalance} users with balance` },
            { label: 'Users', value: users.length, helper: 'Ledger accounts tracked' },
          ]}
        />
        {/* Summary Cards */}
        <DashboardGrid className="grid-cols-1 md:grid-cols-4">
          <StatsCard
            icon={<TrendingUpIcon />}
            title="Total Outstanding"
            value={formatCurrency(totalBalance)}
            subtitle={`${usersWithBalance} users with balance`}
            variant="error"
          />
          <StatsCard
            icon={<AttachMoney />}
            title="Total Debits"
            value={formatCurrency(totalDebit)}
            subtitle="All charges"
            variant="warning"
          />
          <StatsCard
            icon={<TrendingDownIcon />}
            title="Total Credits"
            value={formatCurrency(totalCredit)}
            subtitle="All payments"
            variant="success"
          />
          <StatsCard
            icon={<People />}
            title="Users With Balance"
            value={`${usersWithBalance} / ${users.length}`}
            subtitle="Active accounts"
            variant="info"
          />
        </DashboardGrid>

        {/* Search and Filter */}
        <DashboardPanel
          title="Search & Filter"
          description="Find users quickly"
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto' }, gap: 2 }}>
            <TextField
              placeholder="Search by name or email..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'var(--text-secondary)', fontSize: 20 }} />,
              }}
              fullWidth
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Balance Filter</InputLabel>
              <Select
                value={filterBalance}
                onChange={(e) => setFilterBalance(e.target.value as typeof filterBalance)}
                label="Balance Filter"
                startAdornment={<FilterList sx={{ ml: 1, mr: 0.5, color: 'var(--text-secondary)', fontSize: 20 }} />}
              >
                <MenuItem value="all">All Balances</MenuItem>
                <MenuItem value="positive">Owes Money</MenuItem>
                <MenuItem value="zero">Zero Balance</MenuItem>
                <MenuItem value="negative">Credit Balance</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DashboardPanel>

        {/* Users Table */}
        <DashboardPanel
          title="All User Ledgers"
          description={`${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found`}
          fullHeight
          actions={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Link href="/dashboard/finance/record-payment" style={{ textDecoration: 'none' }}>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Payment />}
                  sx={{ textTransform: 'none', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  Record Payment
                </Button>
              </Link>
            </Box>
          }
        >
          <DataTable
            data={filteredUsers}
            columns={columns}
            keyField="userId"
          />
        </DashboardPanel>
      </DashboardSurface>
    </ProtectedRoute>
  );
}