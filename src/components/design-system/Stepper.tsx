"use client";

import { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

/**
 * Stepper Component
 *
 * Form-wizard stepper with clickable completed steps.
 * (MilestoneStepper remains the display-only status timeline.)
 * Replaces direct MUI Stepper/Step/StepLabel usage. Zero MUI.
 */

export interface StepItem {
  id: string;
  label: string;
  description?: string;
  optional?: boolean;
  icon?: ReactNode;
}

export interface StepperProps {
  steps: StepItem[];
  activeStep: number;
  onStepClick?: (index: number) => void;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md';
  className?: string;
}

export default function Stepper({
  steps,
  activeStep,
  onStepClick,
  orientation = 'horizontal',
  size = 'md',
  className,
}: StepperProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';
  const effectiveSize = isCompact && size === 'md' ? 'sm' : size;
  const isVertical = orientation === 'vertical';

  return (
    <ol
      className={cn(
        'ds-stepper flex',
        isVertical ? 'flex-col' : 'flex-col gap-4 sm:flex-row sm:items-start sm:gap-0',
        className
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = index < activeStep;
        const isCurrent = index === activeStep;
        const isClickable = !!onStepClick && (isCompleted || isCurrent);
        const isLast = index === steps.length - 1;

        const circle = (
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full border-2 font-semibold transition-all duration-200',
              effectiveSize === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm',
              isCompleted && 'border-[var(--accent-gold)] bg-[var(--accent-gold)] text-[var(--text-primary)]',
              isCurrent && 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--text-primary)]',
              !isCompleted && !isCurrent && 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)]',
              isClickable && 'cursor-pointer hover:shadow-md'
            )}
          >
            {isCompleted ? (
              <Check className={effectiveSize === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={3} />
            ) : (
              step.icon ?? index + 1
            )}
          </span>
        );

        const text = (
          <span className={cn('flex min-w-0 flex-col', !isVertical && 'sm:items-center sm:text-center')}>
            <span
              className={cn(
                'font-semibold',
                effectiveSize === 'sm' ? 'text-xs' : 'text-sm',
                isCurrent || isCompleted ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
              )}
            >
              {step.label}
              {step.optional && (
                <span className="ml-1.5 font-normal text-[var(--text-secondary)]">(optional)</span>
              )}
            </span>
            {step.description && (
              <span className="text-xs text-[var(--text-secondary)]">{step.description}</span>
            )}
          </span>
        );

        return (
          <li
            key={step.id}
            className={cn(
              'flex min-w-0',
              isVertical ? 'gap-3' : 'flex-1 gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center'
            )}
          >
            {isClickable ? (
              <button
                type="button"
                onClick={() => onStepClick?.(index)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex min-w-0 items-start gap-3 rounded-lg outline-none',
                  'focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2',
                  !isVertical && 'sm:flex-col sm:items-center sm:gap-2'
                )}
              >
                {circle}
                {text}
              </button>
            ) : (
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex min-w-0 items-start gap-3',
                  !isVertical && 'sm:flex-col sm:items-center sm:gap-2'
                )}
              >
                {circle}
                {text}
              </span>
            )}
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  isVertical
                    ? 'ml-4 min-h-6 w-0.5 flex-1'
                    : 'mt-4 hidden h-0.5 flex-1 sm:mx-2 sm:block',
                  index < activeStep ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border)]'
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
