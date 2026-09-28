'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  X, 
  Truck,
  Package,
  User,
  Loader2,
  ArrowRight,
  Clock,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarcodeScannerModal } from '@/components/ui/BarcodeScannerModal';

interface SearchResult {
  id: string;
  type: 'shipment' | 'item' | 'user';
  title: string;
  subtitle: string;
  link: string;
}

const RECENT_SEARCHES_KEY = 'recentSearches';
const MAX_RECENT = 5;

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchSequenceRef = useRef(0);
  const router = useRouter();

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.filter((item) => typeof item === 'string').slice(0, MAX_RECENT));
        }
      }
    } catch {
      // Corrupted storage — start fresh.
      setRecentSearches([]);
    }
  }, []);

  // Save the typed query (not a result title) to recent searches
  const saveToRecent = useCallback((search: string) => {
    const trimmed = search.trim();
    if (!trimmed) {
      return;
    }

    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Storage unavailable — keep in-memory only.
      }
      return updated;
    });
  }, []);

  // Clear recent searches
  const clearRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Storage unavailable — nothing to clear.
    }
  };

  // Keyboard shortcut (Cmd+K / Ctrl+K) and custom event to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    const handleOpenEvent = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-global-search', handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-global-search', handleOpenEvent);
    };
  }, []);

  // Lock body scroll while the dialog is open
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Focus input when opened; reset state when closed
  useEffect(() => {
    if (isOpen) {
      // Defer so the element exists after the animation mounts it.
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }

    setQuery('');
    setResults([]);
    setSelectedIndex(0);
    setLoading(false);
    searchSequenceRef.current += 1;
  }, [isOpen]);

  // Debounced search with stale-response protection
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      searchSequenceRef.current += 1;
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const sequence = ++searchSequenceRef.current;

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          query: trimmed,
          type: 'all',
          limit: '10',
        });

        const response = await fetch(`/api/search?${params.toString()}`);
        const data = await response.json();

        // Ignore stale responses that arrive after a newer query.
        if (sequence !== searchSequenceRef.current) {
          return;
        }

        const searchResults: SearchResult[] = [];

        // Add shipments
        if (Array.isArray(data.shipments)) {
        data.shipments.forEach((shipment: { id: string; trackingNumber: string; vehicleType: string; status: string }) => {
          searchResults.push({
            id: `shipment-${shipment.id}`,
            type: 'shipment',
            title: shipment.trackingNumber,
            subtitle: `${shipment.vehicleType} - ${shipment.status}`,
            link: `/dashboard/shipments/${shipment.id}`,
          });
        });
      }

      // Add items
      if (Array.isArray(data.items)) {
        data.items.forEach((item: { id: string; vin: string; lotNumber: string; auctionCity: string; containerId: string }) => {
          searchResults.push({
            id: `item-${item.id}`,
            type: 'item',
            title: item.vin,
            subtitle: `Lot: ${item.lotNumber} - ${item.auctionCity}`,
            link: `/dashboard/containers/${item.containerId}`,
          });
        });
      }

      // Add users (admin only)
      if (Array.isArray(data.users)) {
        data.users.forEach((user: { id: string; name: string | null; email: string }) => {
          searchResults.push({
            id: `user-${user.id}`,
            type: 'user',
            title: user.name || user.email,
            subtitle: user.email,
            link: '/dashboard/customers',
          });
        });
      }

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
      if (sequence === searchSequenceRef.current) {
        setResults([]);
      }
    } finally {
      if (sequence === searchSequenceRef.current) {
        setLoading(false);
      }
    }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      saveToRecent(query);
      close();
      router.push(result.link);
    },
    [close, query, router, saveToRecent],
  );

  const handleRecentClick = (search: string) => {
    setQuery(search);
    inputRef.current?.focus();
  };

  // Keep the highlighted result visible while navigating with arrows
  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    const active = list.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, results]);

  // Focus trap + dialog-scoped keyboard navigation
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(results.length - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (results[selectedIndex]) {
          e.preventDefault();
          handleSelect(results[selectedIndex]);
        }
      } else if (e.key === 'Tab') {
        // Simple focus trap: keep Tab cycling inside the dialog.
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'input, button:not([disabled])',
        );
        if (!focusables || focusables.length === 0) {
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, handleSelect, close]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'shipment':
        return <Truck className="h-5 w-5 text-[var(--info)]" />;
      case 'item':
        return <Package className="h-5 w-5 text-[var(--accent-gold)]" />;
      case 'user':
        return <User className="h-5 w-5 text-[var(--success)]" />;
      default:
        return <Search className="h-5 w-5 text-[var(--text-secondary)]" />;
    }
  };

  const typeLabels: Record<SearchResult['type'], string> = {
    shipment: 'Shipment',
    item: 'Item',
    user: 'User',
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open search"
        aria-keyshortcuts="Meta+K Control+K"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-gold)] transition-all"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm hidden lg:inline">Search...</span>
        <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 bg-[var(--panel)] border border-[var(--border)] rounded text-[10px] font-semibold text-[var(--text-secondary)]">
          ⌘K
        </kbd>
      </button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              aria-hidden="true"
            />

            {/* Search Box */}
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-[10vh] px-3 sm:px-4">
              <motion.div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="Global search"
                initial={{ opacity: 0, scale: 0.97, y: -12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -12 }}
                transition={{ duration: 0.15 }}
                className="w-full max-w-2xl rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--panel)' }}
              >
                {/* Search Input */}
                <div
                  role="combobox"
                  aria-expanded={results.length > 0}
                  aria-controls="global-search-results"
                  aria-haspopup="listbox"
                  className="flex items-center gap-3 p-4 border-b border-[var(--border)]"
                >
                  <Search className="h-5 w-5 text-[var(--text-secondary)] flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    role="searchbox"
                    aria-label="Search shipments, items, and users"
                    aria-autocomplete="list"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search shipments, items, users..."
                    className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-base min-w-0"
                  />
                  {loading && (
                    <Loader2 className="h-5 w-5 text-[var(--accent-gold)] animate-spin flex-shrink-0" aria-label="Searching" />
                  )}
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    aria-label="Scan barcode or VIN"
                    title="Scan barcode or VIN"
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-gold)] hover:bg-[var(--background)] transition-colors"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close search"
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Results / Recent */}
                <div
                  id="global-search-results"
                  ref={listRef}
                  role={query.trim() ? 'listbox' : undefined}
                  aria-label={query.trim() ? 'Search results' : undefined}
                  className="max-h-[55vh] overflow-y-auto"
                >
                  {query.trim() ? (
                    // Search Results
                    results.length > 0 ? (
                      <div className="p-2">
                        {results.map((result, index) => (
                          <button
                            key={result.id}
                            type="button"
                            role="option"
                            aria-selected={selectedIndex === index}
                            data-active={selectedIndex === index ? 'true' : undefined}
                            onClick={() => handleSelect(result)}
                            onMouseMove={() => setSelectedIndex(index)}
                            className={cn(
                              'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors border',
                              selectedIndex === index
                                ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)]'
                                : 'border-transparent hover:bg-[var(--background)]',
                            )}
                          >
                            <div className="flex-shrink-0">{getIcon(result.type)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[var(--text-primary)] font-medium truncate">{result.title}</p>
                              <p className="text-sm text-[var(--text-secondary)] truncate">{result.subtitle}</p>
                            </div>
                            <span className="hidden sm:inline-flex flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]">
                              {typeLabels[result.type]}
                            </span>
                            <ArrowRight className="h-4 w-4 text-[var(--text-secondary)] flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    ) : !loading ? (
                      <div className="p-12 text-center">
                        <Search className="h-12 w-12 text-[var(--text-secondary)] opacity-40 mx-auto mb-3" />
                        <p className="text-[var(--text-primary)]">No results found</p>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Try searching for a tracking number, VIN, or name</p>
                      </div>
                    ) : (
                      <div className="p-8 space-y-2" aria-hidden="true">
                        {[0, 1, 2, 3].map((row) => (
                          <div
                            key={row}
                            className="flex items-center gap-3 p-3 rounded-lg animate-pulse"
                            style={{ backgroundColor: 'var(--background)' }}
                          >
                            <div className="h-8 w-8 rounded-full bg-[var(--border)]" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 rounded bg-[var(--border)]" style={{ width: `${65 - row * 8}%` }} />
                              <div className="h-2.5 rounded bg-[var(--border)]" style={{ width: `${45 - row * 5}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    // Recent Searches
                    recentSearches.length > 0 ? (
                      <div className="p-2">
                        <div className="flex items-center justify-between px-3 py-2">
                          <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Recent Searches
                          </h3>
                          <button
                            type="button"
                            onClick={clearRecent}
                            className="text-xs text-[var(--accent-gold)] hover:underline transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                        {recentSearches.map((search, index) => (
                          <button
                            key={`${search}-${index}`}
                            type="button"
                            onClick={() => handleRecentClick(search)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-[var(--background)] transition-colors"
                          >
                            <Search className="h-4 w-4 text-[var(--text-secondary)]" />
                            <span className="text-[var(--text-primary)]">{search}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center">
                        <Search className="h-12 w-12 text-[var(--text-secondary)] opacity-40 mx-auto mb-3" />
                        <p className="text-[var(--text-primary)]">Start typing to search</p>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Find shipments, items, or users</p>
                      </div>
                    )
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] bg-[var(--background)]">
                  <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-[var(--panel)] border border-[var(--border)] rounded text-[10px]">↑↓</kbd>
                      <span>Navigate</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-[var(--panel)] border border-[var(--border)] rounded text-[10px]">↵</kbd>
                      <span>Select</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-[var(--panel)] border border-[var(--border)] rounded text-[10px]">esc</kbd>
                      <span>Close</span>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]" aria-live="polite">
                    {loading ? 'Searching…' : results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : ''}
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(scannedText) => {
          setScannerOpen(false);
          setQuery(scannedText);
          inputRef.current?.focus();
        }}
        title="Scan Barcode or VIN"
        description="Align vehicle VIN, container number, or gate pass within the frame"
      />
    </>
  );
}

