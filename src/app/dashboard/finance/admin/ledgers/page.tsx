'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Eye,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  CreditCard,
} from 'lucide-react';
import {
  Button,
  StatusBadge,
  DashboardPageSkeleton,
  StatsCard,
  PageHeader,
  Select,
} from '@/components/design-system';
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
        <StatusBadge
          status="ERROR"
          label={formatCurrency(balance)}
          size="sm"
          icon={<TrendingUp className="w-3.5 h-3.5" />}
        />
      );
    }
    if (balance < 0) {
      return (
        <StatusBadge
          status="SUCCESS"
          label={formatCurrency(Math.abs(balance))}
          size="sm"
          icon={<TrendingDown className="w-3.5 h-3.5" />}
        />
      );
    }
    return (
      <StatusBadge
        status="DEFAULT"
        label={formatCurrency(0)}
        size="sm"
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
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {row.userName}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {row.email}
          </p>
        </div>
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
        <span className="text-sm text-[var(--text-primary)]">
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
        <span className="text-sm text-[var(--success)]">
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
        <span className="text-sm text-[var(--text-primary)]">
          {row.transactionCount}
        </span>
      )
    },
    {
      key: 'lastTransaction',
      header: 'Last Activity',
      sortable: true,
      render: (_, row) => (
        <span className="text-xs text-[var(--text-secondary)]">
          {formatDate(row.lastTransaction)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      render: (_, row) => (
        <div className="flex justify-end whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <Link href={`/dashboard/finance/admin/ledgers/${row.userId}`} className="no-underline">
            <Button
              variant="outline"
              size="sm"
              icon={<Eye className="w-4 h-4" />}
            >
              View Ledger
            </Button>
          </Link>
        </div>
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
            icon={<TrendingUp className="w-5 h-5" />}
            title="Total Outstanding"
            value={formatCurrency(totalBalance)}
            subtitle={`${usersWithBalance} users with balance`}
            variant="error"
          />
          <StatsCard
            icon={<DollarSign className="w-5 h-5" />}
            title="Total Debits"
            value={formatCurrency(totalDebit)}
            subtitle="All charges"
            variant="warning"
          />
          <StatsCard
            icon={<TrendingDown className="w-5 h-5" />}
            title="Total Credits"
            value={formatCurrency(totalCredit)}
            subtitle="All payments"
            variant="success"
          />
          <StatsCard
            icon={<Users className="w-5 h-5" />}
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
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              />
            </div>
            <div className="min-w-[200px]">
              <Select
                label="Balance Filter"
                value={filterBalance}
                onChange={(value) => setFilterBalance(value as typeof filterBalance)}
                size="small"
                leftIcon={<Filter className="w-4 h-4" />}
                options={[
                  { value: 'all', label: 'All Balances' },
                  { value: 'positive', label: 'Owes Money' },
                  { value: 'zero', label: 'Zero Balance' },
                  { value: 'negative', label: 'Credit Balance' },
                ]}
              />
            </div>
          </div>
        </DashboardPanel>

        {/* Users Table */}
        <DashboardPanel
          title="All User Ledgers"
          description={`${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found`}
          fullHeight
          actions={
            <div className="flex gap-2">
              <Link href="/dashboard/finance/record-payment" className="no-underline">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<CreditCard className="w-4 h-4" />}
                >
                  Record Payment
                </Button>
              </Link>
            </div>
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