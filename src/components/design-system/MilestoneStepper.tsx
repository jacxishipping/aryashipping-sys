"use client";

import { Box, Typography } from '@mui/material';
import { Check, Clock, AlertCircle } from 'lucide-react';
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
  className,
}: MilestoneStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id.toLowerCase() === currentStepId.toLowerCase());
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  return (
    <Box
      className={className}
      sx={{
        width: '100%',
        py: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: orientation === 'vertical' ? 'column' : { xs: 'column', md: 'row' },
          alignItems: orientation === 'vertical' ? 'flex-start' : { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          position: 'relative',
          gap: orientation === 'vertical' ? 2 : { xs: 2, md: 0 },
        }}
      >
        {steps.map((step, idx) => {
          const isCompleted = idx < activeIndex || (idx === activeIndex && status === 'completed');
          const isCurrent = idx === activeIndex && status !== 'completed';
          const isPending = idx > activeIndex;

          return (
            <React.Fragment key={step.id}>
              {/* Connector line for horizontal */}
              {idx > 0 && orientation === 'horizontal' && (
                <Box
                  sx={{
                    display: { xs: 'none', md: 'block' },
                    flex: 1,
                    height: 2,
                    mx: 1.5,
                    bgcolor: isCompleted ? 'var(--accent-gold, #D4AF37)' : 'var(--border, #E5E7EB)',
                    transition: 'background-color 300ms ease',
                  }}
                />
              )}

              {/* Step item */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {/* Step Circle / Badge */}
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    transition: 'all 240ms ease',
                    ...(isCompleted
                      ? {
                          bgcolor: 'var(--accent-gold, #D4AF37)',
                          color: '#FFFFFF',
                          boxShadow: '0 2px 8px rgba(212, 175, 55, 0.35)',
                        }
                      : isCurrent
                      ? {
                          bgcolor: '#FFFFFF',
                          color: 'var(--accent-gold, #D4AF37)',
                          border: '2px solid var(--accent-gold, #D4AF37)',
                          boxShadow: '0 0 0 4px rgba(212, 175, 55, 0.15)',
                        }
                      : {
                          bgcolor: 'var(--background, #F3F4F6)',
                          color: 'var(--text-secondary, #9CA3AF)',
                          border: '1px solid var(--border, #E5E7EB)',
                        }),
                  }}
                >
                  {isCompleted ? (
                    <Check style={{ width: 16, height: 16, strokeWidth: 3 }} />
                  ) : isCurrent ? (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'var(--accent-gold, #D4AF37)',
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        '@keyframes pulse': {
                          '0%, 100%': { opacity: 1 },
                          '50%': { opacity: 0.4 },
                        },
                      }}
                    />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </Box>

                {/* Step Text Info */}
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: '0.8125rem',
                      fontWeight: isCurrent || isCompleted ? 700 : 500,
                      color: isCurrent || isCompleted ? 'var(--text-primary, #111827)' : 'var(--text-secondary, #6B7280)',
                      lineHeight: 1.2,
                    }}
                  >
                    {step.label}
                  </Typography>
                  {step.timestamp && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.6875rem',
                        color: 'var(--text-secondary, #9CA3AF)',
                        display: 'block',
                      }}
                    >
                      {step.timestamp}
                    </Typography>
                  )}
                </Box>
              </Box>
            </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
}
