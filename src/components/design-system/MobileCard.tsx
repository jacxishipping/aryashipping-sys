'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileCardProps {
  title: string;
  subtitle?: string;
  status?: ReactNode;
  image?: string;
  children?: ReactNode;
  onClick?: () => void;
  actions?: ReactNode;
}

export function MobileCard({ 
  title, 
  subtitle, 
  status, 
  image, 
  children, 
  onClick, 
  actions 
}: MobileCardProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-[var(--panel)] border border-[var(--border)] rounded-xl p-4 mb-3 shadow-sm",
        onClick && "active:bg-[var(--background)] transition-colors cursor-pointer"
      )}
    >
      <div className="flex gap-3">
        {image && (
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--background)] flex-shrink-0 border border-[var(--border)]">
            <img src={image} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm text-[var(--text-primary)] truncate">
                {title}
              </h4>
              {subtitle && (
                <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {status && <div className="flex-shrink-0">{status}</div>}
          </div>
          
          {children && (
            <div className="mt-3 text-xs text-[var(--text-secondary)]">
              {children}
            </div>
          )}
          
          {actions && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex justify-end gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
