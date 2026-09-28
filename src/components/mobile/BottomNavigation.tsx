'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Ship, Package, FileText, Menu } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { hasPermission, type Permission } from '@/lib/rbac';

type NavItemDef = {
  icon: typeof Home;
  label: string;
  href: string;
  permission?: Permission;
  isMenuToggle?: boolean;
};

const navItems: NavItemDef[] = [
  { icon: Home, label: 'Home', href: '/dashboard', permission: 'dashboard:view' as Permission },
  { icon: Ship, label: 'Shipments', href: '/dashboard/shipments', permission: 'shipments:view' as Permission },
  { icon: Package, label: 'Containers', href: '/dashboard/containers', permission: 'containers:view' as Permission },
  { icon: FileText, label: 'Invoices', href: '/dashboard/invoices', permission: 'invoices:view' as Permission },
  { icon: Menu, label: 'Menu', href: '#menu', isMenuToggle: true },
];

export function BottomNavigation({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const handleMenuToggle = () => {
    if (onMenuClick) {
      onMenuClick();
    } else {
      window.dispatchEvent(new CustomEvent('toggle-mobile-menu'));
    }
  };

  const isMenuSectionActive =
    !['/dashboard', '/dashboard/shipments', '/dashboard/containers', '/dashboard/invoices'].some(
      (h) => pathname === h || (h !== '/dashboard' && pathname.startsWith(h + '/'))
    );

  const visibleNavItems = navItems.filter((item) =>
    !item.permission || status === 'loading' || hasPermission(session?.user?.role, item.permission)
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-inset-bottom"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 6px)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: 'rgba(var(--panel-rgb), 0.94)',
        borderTop: '1px solid rgba(var(--accent-gold-rgb), 0.25)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
      }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-[62px] px-1">
        {visibleNavItems.map((item) => {
          const isActive = item.isMenuToggle
            ? isMenuSectionActive
            : pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          const Icon = item.icon;

          if (item.isMenuToggle) {
            return (
              <button
                key="menu-toggle-btn"
                type="button"
                onClick={handleMenuToggle}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center h-full min-w-0 px-1 py-1 transition-all duration-150 active:scale-95 touch-target',
                  isActive
                    ? 'text-[var(--accent-gold)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
                aria-label="Open navigation menu"
              >
                {isActive && (
                  <div
                    className="absolute left-1/2 top-1.5 h-1 w-1 -translate-x-1/2 rounded-full"
                    style={{
                      background: 'var(--accent-gold)',
                      boxShadow: '0 0 6px rgba(var(--accent-gold-rgb), 0.6)',
                    }}
                  />
                )}
                <div
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5',
                    isActive && 'px-2 py-0.5'
                  )}
                  style={
                    isActive
                      ? {
                          background: 'rgba(var(--accent-gold-rgb), 0.12)',
                          borderRadius: '10px',
                          padding: '3px 10px',
                        }
                      : undefined
                  }
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="w-full truncate text-center text-[11px] font-semibold tracking-tight">
                    {item.label}
                  </span>
                </div>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center h-full min-w-0 px-1 py-1 transition-all duration-150 active:scale-95 touch-target',
                isActive
                  ? 'text-[var(--accent-gold)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {isActive && (
                <div
                  className="absolute left-1/2 top-1.5 h-1 w-1 -translate-x-1/2 rounded-full"
                  style={{
                    background: 'var(--accent-gold)',
                    boxShadow: '0 0 6px rgba(var(--accent-gold-rgb), 0.6)',
                  }}
                />
              )}
              <div
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5',
                  isActive && 'px-2 py-0.5'
                )}
                style={
                  isActive
                    ? {
                        background: 'rgba(var(--accent-gold-rgb), 0.12)',
                        borderRadius: '10px',
                        padding: '3px 10px',
                      }
                    : undefined
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="w-full truncate text-center text-[11px] font-semibold tracking-tight">
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
