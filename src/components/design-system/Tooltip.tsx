"use client";

import { Tooltip as MuiTooltip, TooltipProps as MuiTooltipProps, Box } from '@mui/material';
import { ReactElement } from 'react';

/**
 * Tooltip Component
 * 
 * Enhanced tooltip with consistent styling and positioning.
 * For contextual help and additional information.
 */

export interface TooltipProps extends Omit<MuiTooltipProps, 'title'> {
  title: string | ReactElement;
  children: ReactElement;
  placement?: 
    | 'top' 
    | 'top-start' 
    | 'top-end' 
    | 'bottom' 
    | 'bottom-start' 
    | 'bottom-end' 
    | 'left' 
    | 'left-start' 
    | 'left-end' 
    | 'right' 
    | 'right-start' 
    | 'right-end';
  arrow?: boolean;
  delay?: number;
}

export default function Tooltip({
  title,
  children,
  placement = 'top',
  arrow = true,
  delay = 200,
  ...props
}: TooltipProps) {
  return (
    <MuiTooltip
      title={title}
      placement={placement}
      arrow={arrow}
      enterDelay={delay}
      enterNextDelay={delay}
      {...props}
      slotProps={{
        popper: {
          sx: {
            '& .MuiTooltip-tooltip': {
              bgcolor: 'var(--panel)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              px: 1.5,
              py: 1,
              borderRadius: 2,
              border: '1px solid var(--border)',
              boxShadow: '0 12px 28px rgba(var(--text-primary-rgb), 0.12), 0 4px 8px rgba(var(--text-primary-rgb), 0.08)',
              maxWidth: 300,
              lineHeight: 1.5,
            },
            '& .MuiTooltip-arrow': {
              color: 'var(--panel)',
              '&::before': {
                border: '1px solid var(--border)',
              },
            },
          },
        },
      }}
    >
      {children}
    </MuiTooltip>
  );
}

// Info Tooltip (with icon)
export function InfoTooltip({ 
  content, 
  placement = 'top' 
}: { 
  content: string; 
  placement?: TooltipProps['placement'];
}) {
  return (
    <Tooltip title={content} placement={placement}>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
          borderRadius: '50%',
          bgcolor: 'rgba(var(--info-rgb), 0.15)',
          color: 'var(--info)',
          fontSize: '0.7rem',
          fontWeight: 700,
          cursor: 'help',
          ml: 0.5,
          '&:hover': {
            bgcolor: 'rgba(var(--info-rgb), 0.25)',
          },
        }}
      >
        ?
      </Box>
    </Tooltip>
  );
}
