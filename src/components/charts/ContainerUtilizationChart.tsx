'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

interface ContainerUtilizationChartProps {
  data: Array<{
    containerNumber: string;
    utilization: number;
    capacity: number;
  }>;
  className?: string;
}

export function ContainerUtilizationChart({ data, className }: ContainerUtilizationChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      name: item.containerNumber,
      utilization: item.utilization,
      remaining: item.capacity - item.utilization,
      capacity: item.capacity, // Pass capacity for tooltip
    }));
  }, [data]);

  const getBarColor = (utilization: number, capacity: number) => {
    const percentage = (utilization / capacity) * 100;
    if (percentage >= 90) return 'var(--error)';
    if (percentage >= 70) return 'var(--warning)';
    return 'var(--success)';
  };

  return (
    <div className={className} style={{ minHeight: '300px', width: '100%' }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
          <XAxis
            dataKey="name"
            stroke="var(--text-secondary)"
            style={{ fontSize: '12px' }}
            tick={{ fill: 'var(--text-secondary)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            stroke="var(--text-secondary)"
            style={{ fontSize: '12px' }}
            tick={{ fill: 'var(--text-secondary)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <Tooltip
            cursor={{ fill: 'var(--border)', opacity: 0.1 }}
            contentStyle={{
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '0.25rem' }}
            itemStyle={{ color: 'var(--text-primary)' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500 }}>{value}</span>}
          />
          <Bar dataKey="utilization" stackId="a" fill="var(--accent-gold)" name="Used" radius={[0, 0, 4, 4]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.utilization, entry.capacity)}
              />
            ))}
          </Bar>
          <Bar
            dataKey="remaining"
            stackId="a"
            fill="var(--border)"
            opacity={0.3}
            name="Available"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
