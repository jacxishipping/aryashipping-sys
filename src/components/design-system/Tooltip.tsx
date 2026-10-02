"use client";

import React, { ReactElement, ReactNode, useState, useRef, useEffect } from 'react';

/**
 * Tooltip Component
 * 
 * Accessible tooltip with consistent styling, animations, and positioning.
 */

export interface TooltipProps {
  title: string | ReactNode;
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
  className?: string;
}

export default function Tooltip({
  title,
  children,
  placement = 'top',
  arrow = true,
  delay = 200,
  className = '',
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!title) return children;

  const getPositionClasses = () => {
    switch (placement) {
      case 'bottom':
      case 'bottom-start':
      case 'bottom-end':
        return 'top-full mt-2 left-1/2 -translate-x-1/2';
      case 'left':
      case 'left-start':
      case 'left-end':
        return 'right-full mr-2 top-1/2 -translate-y-1/2';
      case 'right':
      case 'right-start':
      case 'right-end':
        return 'left-full ml-2 top-1/2 -translate-y-1/2';
      case 'top':
      default:
        return 'bottom-full mb-2 left-1/2 -translate-x-1/2';
    }
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`absolute z-50 pointer-events-none px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[var(--panel)] text-[var(--text-primary)] border border-[var(--border)] shadow-lg max-w-xs whitespace-normal transition-all duration-150 animate-in fade-in zoom-in-95 ${getPositionClasses()} ${className}`}
        >
          {title}
        </div>
      )}
    </div>
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
      <span
        tabIndex={0}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[rgba(var(--info-rgb),0.15)] text-[var(--info)] text-[10px] font-bold cursor-help ml-1 hover:bg-[rgba(var(--info-rgb),0.25)] focus:outline-none focus:ring-1 focus:ring-[var(--info)] transition-colors"
      >
        ?
      </span>
    </Tooltip>
  );
}
