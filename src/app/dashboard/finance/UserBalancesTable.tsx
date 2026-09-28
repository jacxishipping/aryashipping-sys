'use client';

import { DataTable, Column } from '@/components/ui/DataTable';
import { formatMoney } from '@/lib/format';

interface UserBalance {
    userId: string;
    userName: string;
    currentBalance: number;
}

interface UserBalancesTableProps {
    data: UserBalance[];
}

export default function UserBalancesTable({ data }: UserBalancesTableProps) {
    const columns: Column<UserBalance>[] = [
        {
            key: 'userName',
            header: 'User',
            sortable: true,
            render: (_, row) => (
                <div className="font-medium text-[var(--text-primary)]">{row.userName}</div>
            )
        },
        {
            key: 'currentBalance',
            header: 'Balance',
            sortable: true,
            render: (_, row) => (
                <span className="font-mono font-medium text-[var(--text-primary)]">
                    {formatMoney(Math.abs(row.currentBalance))}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (_, row) => {
                if (row.currentBalance > 0) {
                    return (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: 'rgba(var(--warning-rgb), 0.14)', color: 'var(--warning)' }}>
                            Due
                        </span>
                    );
                }
                return (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: 'rgba(var(--accent-gold-rgb), 0.12)', color: 'var(--accent-gold)' }}>
                        Credit
                    </span>
                );
            },
        },
    ];

    return (
        <DataTable
            data={data}
            keyField="userId"
            columns={columns}
        />
    );
}
