'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { 
  Search, 
  FileText, 
  Package, 
  Ship, 
  Users, 
  Settings, 
  Home, 
  TrendingUp, 
  Car, 
  Compass, 
  CreditCard, 
  Truck, 
  PlusCircle, 
  Clock,
  Landmark,
  BookOpen,
  QrCode,
  Calendar,
  Layers,
  Sparkles,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/design-system';
import { setGlobalTheme, setGlobalDensity } from '@/hooks/useTheme';

interface ShipmentSearchHit {
  id: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  status: string;
  user: { name: string | null; email: string };
}

interface ContainerSearchHit {
  id: string;
  containerNumber: string;
  vesselName: string | null;
  destinationPort: string | null;
  status: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [shipmentHits, setShipmentHits] = useState<ShipmentSearchHit[]>([]);
  const [containerHits, setContainerHits] = useState<ContainerSearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  // Live multi-entity lookup (Shipments & Containers)
  useEffect(() => {
    if (!open) return;
    const term = search.trim().replace(/^>\s*/, '');
    if (term.length < 2) {
      setShipmentHits([]);
      setContainerHits([]);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const [shipmentRes, containerRes] = await Promise.all([
          fetch(`/api/shipments?search=${encodeURIComponent(term)}&limit=5&page=1`).catch(() => null),
          fetch(`/api/containers?search=${encodeURIComponent(term)}&limit=5&page=1`).catch(() => null),
        ]);

        if (shipmentRes && shipmentRes.ok) {
          const data = await shipmentRes.json();
          if (!cancelled) setShipmentHits((data.shipments || []).slice(0, 5));
        }

        if (containerRes && containerRes.ok) {
          const data = await containerRes.json();
          if (!cancelled) setContainerHits((data.containers || []).slice(0, 5));
        }
      } catch {
        if (!cancelled) {
          setShipmentHits([]);
          setContainerHits([]);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, open]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setShipmentHits([]);
      setContainerHits([]);
    }
  }, [open]);

  const vehicleLabel = (hit: ShipmentSearchHit) =>
    [hit.vehicleYear, hit.vehicleMake, hit.vehicleModel].filter(Boolean).join(' ').trim() || 'Vehicle';

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  const isActionFilter = search.startsWith('>');

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={() => onOpenChange(false)}
        />
      )}

      <Command.Dialog
        open={open}
        onOpenChange={onOpenChange}
        label="Global Command Menu"
        className={cn(
          'fixed top-[15%] left-1/2 z-50 w-full max-w-2xl -translate-x-1/2',
          'bg-[var(--panel)] border border-[var(--border)] rounded-xl shadow-2xl',
          'overflow-hidden text-[var(--text-primary)]'
        )}
      >
        <div className="flex items-center border-b border-[var(--border)] px-4 bg-[var(--background)]">
          <Search className="w-5 h-5 text-[var(--accent-gold)] mr-3" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search VIN, container #, or type '>' for actions..."
            className="w-full bg-transparent py-3.5 text-sm sm:text-base text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs text-[var(--text-secondary)] bg-[var(--panel)] border border-[var(--border)] rounded shadow-xs">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[420px] overflow-y-auto p-2">
          <Command.Empty className="py-8 text-center text-sm text-[var(--text-secondary)]">
            {searching ? (
              <span className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 animate-spin text-[var(--accent-gold)]" />
                Searching entities...
              </span>
            ) : (
              'No matching records or actions found.'
            )}
          </Command.Empty>

          {/* Quick Actions (Always visible or when > typed) */}
          <Command.Group heading="Quick Actions" className="px-2 py-1.5 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/shipments/new'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <PlusCircle className="w-4 h-4 text-[var(--accent-gold,#D4AF37)]" />
              <span className="font-medium text-sm">Create New Shipment</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/containers/new'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <Package className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-sm">New Container Booking</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/invoices/new'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">Create Customer Invoice</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/finance/record-payment'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-sm">Record Payment / Transaction</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/finance/banking'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <Landmark className="w-4 h-4 text-indigo-600" />
              <span className="font-medium text-sm">Import Bank CSV Statement</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/operations'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <Layers className="w-4 h-4 text-amber-500" />
              <div className="flex items-center justify-between w-full">
                <span className="font-medium text-sm">Drag & Drop Operations Board</span>
                <span className="text-[10px] uppercase font-bold text-[var(--accent-gold)]">Dispatch</span>
              </div>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/finance/ledger'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <BookOpen className="w-4 h-4 text-violet-600" />
              <span className="font-medium text-sm">Open General Ledger</span>
            </Command.Item>

            {/* Layout Density Commands */}
            <Command.Item
              onSelect={() => runCommand(() => setGlobalDensity('compact'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <Minimize2 className="w-4 h-4 text-amber-500" />
              <div className="flex items-center justify-between w-full">
                <span className="font-medium text-sm">Switch to Compact Theme (High Density)</span>
                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Layout</span>
              </div>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => setGlobalDensity('comfortable'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <Maximize2 className="w-4 h-4 text-emerald-500" />
              <div className="flex items-center justify-between w-full">
                <span className="font-medium text-sm">Switch to Comfort Theme (Relaxed)</span>
                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Layout</span>
              </div>
            </Command.Item>

            {/* Theme Mode Commands */}
            <Command.Item
              onSelect={() => runCommand(() => setGlobalTheme('dark'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <Moon className="w-4 h-4 text-purple-500" />
              <div className="flex items-center justify-between w-full">
                <span className="font-medium text-sm">Switch to Dark Theme</span>
                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Theme</span>
              </div>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => setGlobalTheme('light'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <div className="flex items-center justify-between w-full">
                <span className="font-medium text-sm">Switch to Light Theme</span>
                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Theme</span>
              </div>
            </Command.Item>
          </Command.Group>

          <Command.Separator className="h-px bg-[var(--border)] my-2" />

          {/* Container Search Hits */}
          {containerHits.length > 0 && !isActionFilter && (
            <>
              <Command.Group heading="Containers" className="px-2 py-1.5 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                {containerHits.map((container) => (
                  <Command.Item
                    key={container.id}
                    onSelect={() => runCommand(() => router.push(`/dashboard/containers/${container.id}`))}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Package className="w-4 h-4 text-amber-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-sm block truncate">
                          {container.containerNumber}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)] block truncate">
                          {container.vesselName ? `Vessel: ${container.vesselName}` : 'No vessel'} · {container.destinationPort || 'Port TBD'}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={container.status} size="sm" />
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Separator className="h-px bg-[var(--border)] my-2" />
            </>
          )}

          {/* Shipment Search Hits */}
          {shipmentHits.length > 0 && !isActionFilter && (
            <>
              <Command.Group heading="Shipments & Cargo" className="px-2 py-1.5 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                {shipmentHits.map((hit) => (
                  <Command.Item
                    key={hit.id}
                    onSelect={() => runCommand(() => router.push(`/dashboard/shipments/${hit.id}`))}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Car className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-semibold text-sm block truncate">{vehicleLabel(hit)}</span>
                        <span className="text-xs text-[var(--text-secondary)] block truncate">
                          {hit.vehicleVIN ? <span className="font-mono font-medium">VIN: {hit.vehicleVIN} · </span> : ''}
                          {hit.user.name || hit.user.email}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={hit.status} size="sm" />
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Separator className="h-px bg-[var(--border)] my-2" />
            </>
          )}

          {/* Core Navigation */}
          {!isActionFilter && (
            <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
              >
                <Home className="w-4 h-4" />
                <span className="font-medium text-sm">Dashboard Overview</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/shipments'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
              >
                <Ship className="w-4 h-4" />
                <span className="font-medium text-sm">Shipments</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/containers'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
              >
                <Package className="w-4 h-4" />
                <span className="font-medium text-sm">Containers</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/customers'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
              >
                <Users className="w-4 h-4" />
                <span className="font-medium text-sm">Customers & Accounts</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/transits'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
              >
                <Compass className="w-4 h-4" />
                <span className="font-medium text-sm">Transits & Locations</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/dispatches'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
              >
                <Truck className="w-4 h-4" />
                <span className="font-medium text-sm">Dispatches</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/operations'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
              >
                <Layers className="w-4 h-4 text-amber-500" />
                <span className="font-medium text-sm">Operations Command Board</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/invoices'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
              >
                <FileText className="w-4 h-4" />
                <span className="font-medium text-sm">Invoices & Billing</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/finance/reports/aging'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
              >
                <Calendar className="w-4 h-4" />
                <span className="font-medium text-sm">Aging Schedule Report</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/analytics'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium text-sm">Analytics</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/settings'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
              >
                <Settings className="w-4 h-4" />
                <span className="font-medium text-sm">Settings</span>
              </Command.Item>
            </Command.Group>
          )}
        </Command.List>

        <div className="border-t border-[var(--border)] px-4 py-2.5 text-xs text-[var(--text-secondary)] bg-[var(--background)] flex items-center justify-between">
          <span>Type <kbd className="px-1.5 py-0.5 bg-[var(--panel)] text-[var(--text-primary)] border border-[var(--border)] rounded shadow-2xs font-mono">&gt;</kbd> for actions</span>
          <span>↑↓ Navigate · ↵ Select · ESC Close</span>
        </div>
      </Command.Dialog>
    </>
  );
}