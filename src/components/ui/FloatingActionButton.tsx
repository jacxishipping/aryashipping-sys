'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Ship, Package, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Tooltip from '@/components/design-system/Tooltip';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  href: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    icon: <Ship className="w-5 h-5" />,
    label: 'New Shipment',
    href: '/dashboard/shipments/new',
    color: 'var(--info)',
  },
  {
    icon: <Package className="w-5 h-5" />,
    label: 'New Container',
    href: '/dashboard/containers/new',
    color: 'var(--success)',
  },
  {
    icon: <FileText className="w-5 h-5" />,
    label: 'New Invoice',
    href: '/dashboard/invoices/new',
    color: 'var(--warning)',
  },
];

export function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleAction = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Quick Actions */}
      <div className="fixed right-4 lg:right-8 bottom-20 lg:bottom-8 z-50 flex flex-col-reverse gap-3 items-end">
        {/* Main FAB */}
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-14 h-14 rounded-full shadow-2xl transition-all duration-200',
            'flex items-center justify-center text-white',
            'hover:scale-105 active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-gold)]'
          )}
          style={{
            backgroundColor: open ? 'var(--error)' : 'var(--accent-gold)',
          }}
          aria-label={open ? 'Close quick actions' : 'Open quick actions'}
        >
          {open ? (
            <X className="w-6 h-6 transition-transform duration-200" />
          ) : (
            <Plus className="w-6 h-6 transition-transform duration-200" />
          )}
        </button>

        {open &&
          quickActions.map((action, index) => (
            <div
              key={action.href}
              className="flex items-center gap-3 justify-end animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Tooltip title={action.label} placement="left">
                <button
                  onClick={() => handleAction(action.href)}
                  className={cn(
                    'w-12 h-12 rounded-full shadow-lg transition-all duration-200',
                    'flex items-center justify-center text-white',
                    'hover:scale-110 active:scale-95',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-gold)]'
                  )}
                  style={{ backgroundColor: action.color }}
                  aria-label={action.label}
                >
                  {action.icon}
                </button>
              </Tooltip>
            </div>
          ))}
      </div>
    </>
  );
}
