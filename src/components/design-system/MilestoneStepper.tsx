"use client";

import { Check } from 'lucide-react';
import React, { ReactNode } from 'react';

export interface MilestoneStep {
  id: string;
  label: string;
  description?: string;
  timestamp?: string;
  icon?: ReactNode;
}

export interface MilestoneStepperProps {
  steps: MilestoneStep[];
  currentStepId: string;
  status?: 'default' | 'completed' | 'cancelled' | 'delayed';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export default function MilestoneStepper({
  steps,
  currentStepId,
  status = 'default',
  orientation = 'horizontal',
  className = '',
}: MilestoneStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id.toLowerCase() === currentStepId.toLowerCase());
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className={`w-full py-2 ${className}`}>
      <div
        className={`flex ${
          orientation === 'vertical'
            ? 'flex-col items-start gap-4'
            : 'flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0'
        } relative`}
      >
        {steps.map((step, idx) => {
          const isCompleted = idx < activeIndex || (idx === activeIndex && status === 'completed');
          const isCurrent = idx === activeIndex && status !== 'completed';

          return (
            <React.Fragment key={step.id}>
              {/* Connector line for horizontal */}
              {idx > 0 && orientation === 'horizontal' && (
                <div
                  className="hidden md:block flex-1 h-0.5 mx-3 transition-colors duration-300"
                  style={{
                    backgroundColor: isCompleted ? 'var(--accent-gold)' : 'var(--border)',
                  }}
                />
              )}

              {/* Step item */}
              <div className="flex items-center gap-3 relative z-[1]">
                {/* Step Circle / Badge */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? 'bg-[var(--accent-gold)] text-white shadow-md'
                      : isCurrent
                      ? 'bg-white text-[var(--accent-gold)] border-2 border-[var(--accent-gold)] shadow-[0_0_0_4px_rgba(var(--accent-gold-rgb),0.15)]'
                      : 'bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isCurrent ? (
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-gold)] animate-pulse" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step Text Info */}
                <div className="min-w-0">
                  <p
                    className={`text-xs leading-tight ${
                      isCurrent || isCompleted
                        ? 'font-bold text-[var(--text-primary)]'
                        : 'font-medium text-[var(--text-secondary)]'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.timestamp && (
                    <span className="text-[0.6875rem] text-[var(--text-secondary)] block mt-0.5">
                      {step.timestamp}
                    </span>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
