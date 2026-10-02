"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Breadcrumbs Component
 * 
 * Automatic breadcrumb navigation based on current route.
 * Provides context and easy navigation to parent pages.
 */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]; // Manual override
  homeLabel?: string;
  showHome?: boolean;
  className?: string;
}

// Convert route segment to readable label
function formatSegment(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Generate breadcrumbs from pathname
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let path = '';
  segments.forEach((segment) => {
    path += `/${segment}`;
    
    // Skip dynamic route segments like [id]
    if (segment.startsWith('[') && segment.endsWith(']')) {
      return;
    }

    // Format label
    let label = formatSegment(segment);
    
    // Special cases
    if (segment === 'dashboard') label = 'Dashboard';
    if (segment === 'new') label = 'Create New';
    if (segment === 'edit') label = 'Edit';

    breadcrumbs.push({
      label,
      href: path,
    });
  });

  return breadcrumbs;
}

export default function Breadcrumbs({
  items,
  homeLabel = 'Home',
  showHome = true,
  className,
}: BreadcrumbsProps) {
  const pathname = usePathname();
  const breadcrumbs = items || generateBreadcrumbs(pathname);

  // Don't show breadcrumbs on home page
  if (pathname === '/' || pathname === '/dashboard') {
    return null;
  }

  return (
    <nav
      aria-label="breadcrumb"
      className={`flex items-center gap-1 py-1.5 px-0.5 flex-wrap ${className || ''}`}
    >
      {/* Home link */}
      {showHome && (
        <>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[var(--text-secondary)] hover:bg-[rgba(var(--accent-gold-rgb),0.1)] hover:text-[var(--accent-gold)] transition-colors no-underline text-sm font-medium"
          >
            <Home className="w-4 h-4 text-[var(--text-secondary)]" />
            <span>{homeLabel}</span>
          </Link>
          <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
        </>
      )}

      {/* Breadcrumb items */}
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const itemKey = item.href ?? `${item.label}-${index}`;

        return (
          <div key={itemKey} className="flex items-center gap-1">
            {isLast || !item.href ? (
              // Last item - not clickable
              <span className="text-sm font-semibold text-[var(--text-primary)] px-2 py-1">
                {item.label}
              </span>
            ) : (
              // Clickable breadcrumb
              <>
                <Link
                  href={item.href}
                  className="text-sm font-medium text-[var(--text-secondary)] px-2 py-1 rounded-lg transition-colors hover:bg-[rgba(var(--accent-gold-rgb),0.1)] hover:text-[var(--accent-gold)] no-underline"
                >
                  {item.label}
                </Link>
                <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// Compact variant for mobile
export function BreadcrumbsCompact({ className }: { className?: string }) {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  if (breadcrumbs.length === 0) return null;

  const currentPage = breadcrumbs[breadcrumbs.length - 1];
  const parentPage = breadcrumbs[breadcrumbs.length - 2];

  return (
    <nav
      aria-label="breadcrumb"
      className={`flex items-center gap-1 py-1 ${className || ''}`}
    >
      {parentPage && (
        <>
          {parentPage.href ? (
            <Link
              href={parentPage.href}
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent-gold)] no-underline"
            >
              {parentPage.label}
            </Link>
          ) : (
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {parentPage.label}
            </span>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        </>
      )}
      <span className="text-xs font-semibold text-[var(--text-primary)]">
        {currentPage.label}
      </span>
    </nav>
  );
}
