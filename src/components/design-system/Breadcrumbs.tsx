"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { ChevronRight, Home } from '@mui/icons-material';

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
  segments.forEach((segment, index) => {
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
    <Box
      component="nav"
      aria-label="breadcrumb"
      className={className}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        py: 1.5,
        px: 0.5,
        flexWrap: 'wrap',
      }}
    >
      {/* Home link */}
      {showHome && (
        <>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 1.5,
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
                },
              }}
            >
              <Home sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                }}
              >
                {homeLabel}
              </Typography>
            </Box>
          </Link>
          <ChevronRight sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
        </>
      )}

      {/* Breadcrumb items */}
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const itemKey = item.href ?? `${item.label}-${index}`;

        return (
          <Box key={itemKey} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isLast || !item.href ? (
              // Last item - not clickable
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  px: 1,
                  py: 0.5,
                }}
              >
                {item.label}
              </Typography>
            ) : (
              // Clickable breadcrumb
              <>
                <Link href={item.href} style={{ textDecoration: 'none' }}>
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1.5,
                      transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
                        color: 'var(--accent-gold)',
                      },
                    }}
                  >
                    {item.label}
                  </Typography>
                </Link>
                <ChevronRight sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
              </>
            )}
          </Box>
        );
      })}
    </Box>
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
    <Box
      component="nav"
      aria-label="breadcrumb"
      className={className}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        py: 1,
      }}
    >
      {parentPage && (
        <>
          {parentPage.href ? (
            <Link href={parentPage.href} style={{ textDecoration: 'none' }}>
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  '&:hover': {
                    color: 'var(--accent-gold)',
                  },
                }}
              >
                {parentPage.label}
              </Typography>
            </Link>
          ) : (
            <Typography
              sx={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              {parentPage.label}
            </Typography>
          )}
          <ChevronRight sx={{ fontSize: 14, color: 'var(--text-secondary)' }} />
        </>
      )}
      <Typography
        sx={{
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        {currentPage.label}
      </Typography>
    </Box>
  );
}
