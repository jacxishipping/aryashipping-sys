'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

export function Breadcrumbs({ items, className, showHome = true }: BreadcrumbsProps) {
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: 'Home', href: '/dashboard', icon: <Home className="w-3 h-3" /> }, ...items]
    : items;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn('flex items-center gap-2 text-sm', className)}
    >
      <ol className="flex items-center gap-2 flex-wrap">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
              )}
              
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors duration-200 hover:underline"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    'flex items-center gap-1.5',
                    isLast
                      ? 'text-[var(--text-primary)] font-medium'
                      : 'text-[var(--text-secondary)]'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon}
                  <span className="truncate max-w-[200px]">{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Helper hook to generate breadcrumbs from pathname
export function useBreadcrumbs(pathname: string, customLabels?: Record<string, string>) {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];

  let currentPath = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    
    // Skip dashboard segment as it's the home
    if (segment === 'dashboard') continue;
    
    // Check if this is a dynamic segment (UUID or number)
    const isDynamic = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) || /^\d+$/.test(segment);
    
    const label = customLabels?.[segment] || 
                  (isDynamic ? 'Details' : segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '));
    
    items.push({
      label,
      href: i === segments.length - 1 ? undefined : currentPath,
    });
  }
  
  return items;
}
