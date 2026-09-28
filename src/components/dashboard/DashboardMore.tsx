'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity, Calculator, Truck, Bot, ArrowRight } from 'lucide-react';
import Modal from '@/components/design-system/Modal';
import ShipmentCalculator from '@/components/dashboard/ShipmentCalculator';
import DashboardAiBrief from '@/components/dashboard/DashboardAiBrief';
import { Button } from '@/components/design-system';

type DashboardMoreProps = {
  aiEnabled: boolean;
  aiBriefPayload: any;
  canManageDispatches: boolean;
  shipmentStats?: Array<{ status: string; _count: number }>;
  activeDispatchesCount?: number;
};

export default function DashboardMore({
  aiEnabled,
  aiBriefPayload,
  canManageDispatches,
  shipmentStats = [],
  activeDispatchesCount = 0,
}: DashboardMoreProps) {
  const [showCalculator, setShowCalculator] = useState(false);
  const [showAi, setShowAi] = useState(false);

  const totalShipments = shipmentStats.reduce((sum, s) => sum + (s._count || 0), 0);

  return (
    <>
      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            More tools &amp; insights
          </div>
          <Button href="/dashboard/analytics" variant="ghost" size="sm">
            Analytics
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Trends & Charts */}
          <Link
            href="/dashboard/analytics"
            className="group flex flex-col rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 hover:border-[var(--accent-gold)]/30 transition-all text-left"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-md p-2 bg-[rgba(var(--accent-gold-rgb),0.08)] text-[var(--accent-gold)]">
                <Activity className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--accent-gold)] transition-colors" />
            </div>
            <div className="mt-2">
              <div className="font-medium text-[var(--text-primary)] text-sm">Trends &amp; Utilization</div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                14-day movement &amp; containers
              </div>
            </div>
          </Link>

          {/* Rate Calculator */}
          <button
            onClick={() => setShowCalculator(true)}
            className="group flex flex-col rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-left hover:border-[var(--accent-gold)]/30 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-md p-2 bg-[rgba(var(--success-rgb),0.1)] text-[var(--success)]">
                <Calculator className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--accent-gold)] transition-colors" />
            </div>
            <div className="mt-3">
              <div className="font-semibold text-[var(--text-primary)]">Rate Calculator</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                Instant quotes using current company price lists
              </div>
            </div>
          </button>

          {/* Pipeline */}
          <Link
            href="/dashboard/dispatches"
            className="group flex flex-col rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 hover:border-[var(--accent-gold)]/30 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-md p-2 bg-[rgba(var(--info-rgb),0.1)] text-[var(--info)]">
                <Truck className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--accent-gold)] transition-colors" />
            </div>
            <div className="mt-3">
              <div className="font-semibold text-[var(--text-primary)]">Operations Pipeline</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                {canManageDispatches
                  ? `${activeDispatchesCount} active dispatches • ${totalShipments} total shipments`
                  : 'View shipments, containers and dispatch status'}
              </div>
            </div>
          </Link>

          {/* AI Brief */}
          <button
            onClick={() => setShowAi(true)}
            className="group flex flex-col rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-left hover:border-[var(--accent-gold)]/30 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-md p-2 bg-[rgba(var(--accent-gold-rgb),0.1)] text-[var(--accent-gold)]">
                <Bot className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--accent-gold)] transition-colors" />
            </div>
            <div className="mt-3">
              <div className="font-semibold text-[var(--text-primary)]">AI Ops Brief</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                Multi-mode summary • exceptions, finance, dispatch
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Calculator Modal */}
      <Modal
        open={showCalculator}
        onClose={() => setShowCalculator(false)}
        title="Quick Rate Calculator"
        description="Estimate shipping cost using current rates and company price lists"
        size="lg"
      >
        <div className="py-2">
          <ShipmentCalculator />
        </div>
        <div className="pt-2 text-[10px] text-[var(--text-secondary)]">
          Rates are estimates. Actual pricing may vary based on final details.
        </div>
      </Modal>

      {/* AI Brief Modal */}
      <Modal
        open={showAi}
        onClose={() => setShowAi(false)}
        title="AI Operations Brief"
        description="Generate an on-demand summary from current dashboard data"
        size="lg"
      >
        <div className="-mx-1">
          <DashboardAiBrief aiEnabled={aiEnabled} payload={aiBriefPayload} />
        </div>
      </Modal>
    </>
  );
}
