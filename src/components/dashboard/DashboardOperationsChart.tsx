'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Activity, BarChart3, PieChart as PieIcon, Layers } from 'lucide-react';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';

type TrendPoint = {
  date: string;
  shipments: number;
  inTransit: number;
};

type ContainerCap = {
  containerNumber: string;
  utilization: number;
  capacity: number;
};

type StatusStat = {
  status: string;
  _count: number;
};

type DashboardOperationsChartProps = {
  trends: TrendPoint[];
  containerUtilization: ContainerCap[];
  shipmentStats: StatusStat[];
};

const STATUS_LABELS: Record<string, string> = {
  ON_HAND: 'On Hand',
  DISPATCHING: 'Dispatching',
  DISPATCHED: 'Dispatched',
  IN_TRANSIT: 'In Transit',
  ARRIVED_AT_PORT: 'Arrived At Port',
  LOADED_IN_CONTAINER: 'Loaded in Container',
  CUSTOMS_CLEARANCE: 'Customs Hold',
  RELEASED: 'Released',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS = [
  '#D4AF37', // Accent Gold
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];

export default function DashboardOperationsChart({
  trends,
  containerUtilization,
  shipmentStats,
}: DashboardOperationsChartProps) {
  const [activeTab, setActiveTab] = useState<'trends' | 'status' | 'containers'>('trends');

  const formattedTrends = useMemo(() => {
    return trends.map((item) => ({
      ...item,
      displayDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [trends]);

  const formattedStats = useMemo(() => {
    return shipmentStats
      .filter((s) => s._count > 0)
      .map((item, index) => ({
        name: STATUS_LABELS[item.status] || item.status,
        count: item._count,
        color: STATUS_COLORS[index % STATUS_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [shipmentStats]);

  const totalStatusCount = useMemo(
    () => formattedStats.reduce((sum, item) => sum + item.count, 0),
    [formattedStats]
  );

  const formattedContainers = useMemo(() => {
    return containerUtilization.map((c) => ({
      name: c.containerNumber,
      utilized: c.utilization,
      remaining: Math.max(0, c.capacity - c.utilization),
      rate: c.capacity > 0 ? Math.round((c.utilization / c.capacity) * 100) : 0,
      total: c.capacity,
    }));
  }, [containerUtilization]);

  return (
    <DashboardPanel
      title={
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--accent-gold)]" />
          <span className="font-semibold text-[var(--text-primary)]">Operations Velocity &amp; Analytics</span>
        </div>
      }
      description="Real-time operational momentum, pipeline distribution, and fleet utilization"
      actions={
        <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--background)] p-1 text-xs">
          <button
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all ${
              activeTab === 'trends'
                ? 'bg-[var(--panel)] text-[var(--accent-gold)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">14-Day Movement</span>
            <span className="sm:hidden">Trends</span>
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all ${
              activeTab === 'status'
                ? 'bg-[var(--panel)] text-[var(--accent-gold)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <PieIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pipeline Status</span>
            <span className="sm:hidden">Pipeline</span>
          </button>
          <button
            onClick={() => setActiveTab('containers')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all ${
              activeTab === 'containers'
                ? 'bg-[var(--panel)] text-[var(--accent-gold)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Container Capacity</span>
            <span className="sm:hidden">Capacity</span>
          </button>
        </div>
      }
    >
      <div className="w-full pt-2">
        {activeTab === 'trends' && (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedTrends} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="opGoldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="opTransitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  stroke="var(--text-secondary)"
                  style={{ fontSize: '11px' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis
                  stroke="var(--text-secondary)"
                  style={{ fontSize: '11px' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                  }}
                  labelStyle={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }}
                  formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="shipments"
                  name="New Shipments"
                  stroke="#D4AF37"
                  strokeWidth={2.2}
                  fill="url(#opGoldGrad)"
                  activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="inTransit"
                  name="In Transit"
                  stroke="#10B981"
                  strokeWidth={2.2}
                  fill="url(#opTransitGrad)"
                  activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'status' && (
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
            <div className="h-[260px] lg:col-span-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedStats}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {formattedStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--panel)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:col-span-6">
              {formattedStats.map((item) => {
                const pct = totalStatusCount > 0 ? Math.round((item.count / totalStatusCount) * 100) : 0;
                return (
                  <div
                    key={item.name}
                    className="flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 transition-colors hover:border-[var(--accent-gold)]/40"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate font-medium">{item.name}</span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-lg font-bold text-[var(--text-primary)]">{item.count}</span>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'containers' && (
          <div className="h-[280px] w-full">
            {formattedContainers.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[var(--text-secondary)]">
                No active containers recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedContainers} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '11px' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '11px' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: any) => [
                      value,
                      name === 'utilized' ? 'Vehicles Loaded' : 'Remaining Capacity',
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }}
                    formatter={(value) => (
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {value === 'utilized' ? 'Vehicles Loaded' : 'Remaining Capacity'}
                      </span>
                    )}
                  />
                  <Bar dataKey="utilized" stackId="a" fill="#D4AF37" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="remaining" stackId="a" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </DashboardPanel>
  );
}
