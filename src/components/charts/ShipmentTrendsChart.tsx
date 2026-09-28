'use client';

import { useMemo } from 'react';
import {
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ShipmentTrendsChartProps {
  data: Array<{
    date: string;
    shipments: number;
    inTransit: number;
  }>;
  className?: string;
}

export function ShipmentTrendsChart({ data, className }: ShipmentTrendsChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [data]);

  return (
    <div className={className} style={{ minHeight: '300px', width: '100%' }}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-gold)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--accent-gold)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
          <XAxis
            dataKey="date"
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
            contentStyle={{
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
            itemStyle={{ color: 'var(--text-primary)' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500 }}>{value}</span>}
          />
          <Area
            type="monotone"
            dataKey="shipments"
            stroke="none"
            fill="url(#goldGradient)"
            fillOpacity={1}
          />
          <Line
            type="monotone"
            dataKey="shipments"
            stroke="var(--accent-gold)"
            strokeWidth={2.5}
            dot={{ fill: 'var(--accent-gold)', r: 5, strokeWidth: 0 }}
            activeDot={{ r: 7, stroke: 'var(--background)', strokeWidth: 2 }}
            name="Total Shipments"
          />
          <Line
            type="monotone"
            dataKey="inTransit"
            stroke="var(--success)"
            strokeWidth={2.5}
            dot={{ fill: 'var(--success)', r: 5, strokeWidth: 0 }}
            activeDot={{ r: 7, stroke: 'var(--background)', strokeWidth: 2 }}
            name="In Transit"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
