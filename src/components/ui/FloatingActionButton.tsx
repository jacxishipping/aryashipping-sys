'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Ship, Package, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Fab, Tooltip, Zoom, Box } from '@mui/material';

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
    color: '#3B82F6',
  },
  {
    icon: <Package className="w-5 h-5" />,
    label: 'New Container',
    href: '/dashboard/containers/new',
    color: '#10B981',
  },
  {
    icon: <FileText className="w-5 h-5" />,
    label: 'New Invoice',
    href: '/dashboard/invoices/new',
    color: '#F59E0B',
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
      <Box
        sx={{
          position: 'fixed',
          right: { xs: 16, lg: 32 },
          bottom: { xs: 80, lg: 32 },
          zIndex: 1300,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: 2,
          alignItems: 'flex-end',
        }}
      >
        {quickActions.map((action, index) => (
          <Zoom
            key={action.href}
            in={open}
            timeout={200 + index * 50}
            style={{ transitionDelay: open ? `${index * 50}ms` : '0ms' }}
          >
            <div className="flex items-center gap-3 justify-end">
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
          </Zoom>
        ))}

        {/* Main FAB */}
        <Fab
          onClick={() => setOpen(!open)}
          sx={{
            bgcolor: open ? 'var(--error)' : 'var(--accent-gold)',
            color: 'white',
            width: 56,
            height: 56,
            '&:hover': {
              bgcolor: open ? '#EF4444' : '#C99B2F',
              transform: 'scale(1.05)',
            },
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
          aria-label={open ? 'Close quick actions' : 'Open quick actions'}
        >
          {open ? (
            <X className="w-6 h-6 transition-transform duration-200 rotate-0" />
          ) : (
            <Plus className="w-6 h-6 transition-transform duration-200 rotate-0" />
          )}
        </Fab>
      </Box>
    </>
  );
}
