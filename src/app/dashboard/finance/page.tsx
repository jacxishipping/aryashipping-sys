import { formatMoney as formatCurrency, formatMoneyCompact } from '@/lib/format';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import Link from 'next/link';
import {
  DashboardSurface,
  DashboardPanel,
  DashboardGrid
} from '@/components/dashboard/DashboardSurface';
import UserBalancesTable from './UserBalancesTable';
import {
  StatsCard,
  Button,
  PageHeader,
} from '@/components/design-system';
import {
  DollarSign,
  Users,
  FileText,
  Landmark,
  PlusCircle,
  AlertCircle,
  CheckCircle,
  Building2,
  HandCoins,
  GitCompareArrows,
  ArrowLeftRight,
} from 'lucide-react';
import type { ReactNode } from 'react';

// Force dynamic rendering (requires database connection)
export const dynamic = 'force-dynamic';

async function getFinancialData(userId: string | undefined, isAdmin: boolean) {
    // Basic permissions check logic for data scope
    const whereUserId = isAdmin ? undefined : userId;

    // 1. Ledger Summary
    // Admin sees all, User sees own.
    const ledgerWhere = whereUserId ? { userId: whereUserId } : {};
    const shipmentWhere = whereUserId ? { userId: whereUserId } : {};

    // ⚡ Bolt: Execute all independent sequential database queries in parallel using Promise.all to reduce latency.
    const [
        ledgerSummary,
        shipmentSummaryRaw,
        users,
        dispatchExpenseSummary
    ] = await Promise.all([
        prisma.ledgerEntry.groupBy({
            by: ['type'],
            where: ledgerWhere,
            _sum: { amount: true },
            _count: { id: true },
        }),
        prisma.shipment.groupBy({
            by: ['paymentStatus'],
            where: shipmentWhere,
            _sum: { price: true },
            _count: { id: true },
        }),
        isAdmin ? prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                ledgerEntries: {
                    orderBy: { transactionDate: 'desc' },
                    take: 1,
                    select: { balance: true },
                },
            },
        }) : Promise.resolve([]),
        isAdmin ? prisma.dispatchExpense.aggregate({
            _sum: { amount: true },
            _count: { id: true },
        }) : Promise.resolve({ _sum: { amount: 0 }, _count: { id: 0 } }),
    ]);

    const totalDebit = ledgerSummary.find(e => e.type === 'DEBIT')?._sum.amount || 0;
    const totalCredit = ledgerSummary.find(e => e.type === 'CREDIT')?._sum.amount || 0;
    const netBalance = totalDebit - totalCredit;

    const paidShipments = shipmentSummaryRaw.find(s => s.paymentStatus === 'COMPLETED') || { _count: { id: 0 }, _sum: { price: 0 } };
    const dueShipments = shipmentSummaryRaw.find(s => s.paymentStatus === 'PENDING') || { _count: { id: 0 }, _sum: { price: 0 } };

    let userBalances: Array<{ userId: string; userName: string; currentBalance: number }> = [];

    if (isAdmin) {
        // Filter only users with non-zero balance for the top list
        userBalances = users
            .map(user => ({
                userId: user.id,
                userName: user.name || user.email,
                currentBalance: user.ledgerEntries[0]?.balance || 0,
            }))
            .filter(u => Math.abs(u.currentBalance) > 0.01) // Filter out zero balances
            .sort((a, b) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance)) // Sort by magnitude
            .slice(0, 10); // Top 10
    }

    return {
        ledger: {
            totalDebit,
            totalCredit,
            netBalance
        },
        shipments: {
            paid: { count: paidShipments._count.id, amount: paidShipments._sum.price || 0 },
            due: { count: dueShipments._count.id, amount: dueShipments._sum.price || 0 }
        },
        userBalances,
        dispatches: {
            totalSpend: dispatchExpenseSummary._sum.amount || 0,
            expenseCount: dispatchExpenseSummary._count.id || 0,
        },
    };
}

// Data-driven quick actions so the card markup is declared once.
type QuickAction = {
    href: string;
    label: string;
    description: string;
    icon: ReactNode;
    adminOnly?: boolean;
};

export default async function FinancePage() {
    const session = await auth();
    if (!session?.user) redirect('/auth/signin');

    const isAdmin = hasPermission(session.user.role, 'finance:manage');
    const data = await getFinancialData(session.user.id, isAdmin);

    const quickActions: QuickAction[] = [
        { href: '/dashboard/finance/office-expenses', label: 'Office & Operating Expenses', description: 'Manage office overhead, rent, utilities, payroll, and supplies', icon: <Building2 className="w-5 h-5" />, adminOnly: true },
        { href: '/dashboard/finance/ledger', label: 'My Ledger', description: 'View your transaction history', icon: <FileText className="w-5 h-5" /> },
        { href: '/dashboard/finance/banking', label: 'Banking', description: 'Preview and import bank CSV statements into your ledger', icon: <Landmark className="w-5 h-5" /> },
        { href: '/dashboard/finance/admin/ledgers', label: 'User Ledgers', description: 'Manage all user accounts', icon: <Users className="w-5 h-5" />, adminOnly: true },
        { href: '/dashboard/finance/reports', label: 'Financial Reports', description: 'Generate detailed analysis', icon: <FileText className="w-5 h-5" />, adminOnly: true },
        { href: '/dashboard/finance/companies', label: 'Company Ledgers', description: 'Manage partner company accounts', icon: <Building2 className="w-5 h-5" />, adminOnly: true },
        { href: '/dashboard/finance/transfers', label: 'Inter-Ledger Transfers', description: 'Transfer funds and balances between customer and company accounts', icon: <ArrowLeftRight className="w-5 h-5" />, adminOnly: true },
        { href: '/dashboard/finance/price-comparison', label: 'Price Comparison', description: 'Compare shipping rate sheets across companies', icon: <GitCompareArrows className="w-5 h-5" />, adminOnly: true },
    ];

    const visibleQuickActions = quickActions.filter((action) => !action.adminOnly || isAdmin);
    const showOutstandingBalances = isAdmin && data.userBalances.length > 0;

    return (
        <DashboardSurface>
            <PageHeader 
                showBreadcrumbs
                title="Accounting & Finance"
                description="Manage client ledgers, payment records, and financial accounting reports"
                actions={
                    isAdmin && (
                        <Link href="/dashboard/finance/record-payment" style={{ textDecoration: 'none' }}>
                            <Button variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
                                Record Payment
                            </Button>
                        </Link>
                    )
                }
            />

            {/* Summary Stats */}
            <DashboardGrid className={isAdmin ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}>
                <StatsCard
                    icon={<DollarSign className="w-5 h-5" />}
                    title="Net Balance"
                    value={formatCurrency(Math.abs(data.ledger.netBalance))}
                    compactValue={formatMoneyCompact(Math.abs(data.ledger.netBalance))}
                    subtitle={`${data.ledger.netBalance > 0 ? 'Receivable' : 'Payable'} • Debit ${formatMoneyCompact(data.ledger.totalDebit)} / Credit ${formatMoneyCompact(data.ledger.totalCredit)}`}
                    variant="default"
                    trend={{
                        value: 0,
                        isPositive: data.ledger.netBalance >= 0
                    }}
                />
                <StatsCard
                    icon={<CheckCircle className="w-5 h-5" />}
                    title="Paid Shipments"
                    value={data.shipments.paid.count}
                    subtitle={`Collected ${formatMoneyCompact(data.shipments.paid.amount)}`}
                    variant="success"
                />
                <StatsCard
                    icon={<AlertCircle className="w-5 h-5" />}
                    title="Due Shipments"
                    value={data.shipments.due.count}
                    subtitle={`Outstanding ${formatMoneyCompact(data.shipments.due.amount)}`}
                    variant="warning"
                />
                {isAdmin && (
                    <StatsCard
                        icon={<HandCoins className="w-5 h-5" />}
                        title="Dispatch Spend"
                        value={formatCurrency(data.dispatches.totalSpend)}
                        compactValue={formatMoneyCompact(data.dispatches.totalSpend)}
                        subtitle={`${data.dispatches.expenseCount} expense entries`}
                        variant="default"
                    />
                )}
            </DashboardGrid>

            {/* Quick Actions & User Balances */}
            <DashboardGrid className={isAdmin ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}>
                
                {/* Quick Actions */}
                <DashboardPanel
                    title="Quick Actions"
                    className={showOutstandingBalances ? "lg:col-span-1" : "lg:col-span-3"}
                >
                    <div className="grid grid-cols-1 gap-3">
                        {visibleQuickActions.map((action) => (
                            <Link key={action.href} href={action.href}>
                                <div className="p-4 rounded-xl border border-border bg-panel hover:border-[var(--accent-gold)] hover:shadow-lg transition-all cursor-pointer group">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-9 h-9 rounded-lg border border-border bg-[rgba(var(--accent-gold-rgb),0.12)] flex items-center justify-center text-[var(--accent-gold)] group-hover:scale-110 transition-transform">
                                            {action.icon}
                                        </div>
                                        <span className="font-semibold text-primary">{action.label}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{action.description}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </DashboardPanel>

                {/* Top User Balances (Admin Only) */}
                {showOutstandingBalances && (
                    <DashboardPanel 
                        title="Outstanding Balances" 
                        description="Top users with dues"
                        className="lg:col-span-2"
                        noBodyPadding
                    >
                        <UserBalancesTable data={data.userBalances} />
                    </DashboardPanel>
                )}
            </DashboardGrid>
        </DashboardSurface>
    );
}