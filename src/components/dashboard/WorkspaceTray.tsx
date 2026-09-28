'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  History, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Car, 
  Package, 
  FileText, 
  Users, 
  Clock, 
  ExternalLink 
} from 'lucide-react';

export interface WorkspaceItem {
  id: string;
  type: 'shipment' | 'container' | 'invoice' | 'customer';
  title: string;
  subtitle?: string;
  url: string;
  timestamp: number;
}

const STORAGE_KEY = 'jacxi_workspace_recent_items';
const MAX_ITEMS = 8;

export function addWorkspaceItem(item: Omit<WorkspaceItem, 'timestamp'>) {
  if (typeof window === 'undefined') return;
  try {
    const existing: WorkspaceItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filtered = existing.filter((i) => i.id !== item.id || i.type !== item.type);
    const updated: WorkspaceItem[] = [{ ...item, timestamp: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('workspace-items-updated'));
  } catch {}
}

export function WorkspaceTray() {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [expanded, setExpanded] = useState(false);

  const loadItems = useCallback(() => {
    try {
      const stored: WorkspaceItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setItems(stored);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    loadItems();
    window.addEventListener('workspace-items-updated', loadItems);
    window.addEventListener('storage', loadItems);
    return () => {
      window.removeEventListener('workspace-items-updated', loadItems);
      window.removeEventListener('storage', loadItems);
    };
  }, [loadItems]);

  const removeItem = (e: React.MouseEvent, id: string, type: string) => {
    e.stopPropagation();
    const updated = items.filter((i) => !(i.id === id && i.type === type));
    setItems(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (items.length === 0) return null;

  const getItemIcon = (type: WorkspaceItem['type']) => {
    switch (type) {
      case 'shipment':
        return Car;
      case 'container':
        return Package;
      case 'invoice':
        return FileText;
      case 'customer':
        return Users;
      default:
        return History;
    }
  };

  return (
    <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] lg:bottom-3 right-3 sm:right-4 z-40 max-w-xl w-[calc(100%-24px)] sm:w-auto">
      <div className="rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-xl overflow-hidden backdrop-blur-md transition-all duration-300">
        {/* Collapsed Header Bar */}
        <div 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between px-3 py-2 bg-[var(--background)] cursor-pointer hover:bg-[var(--border)]/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-gold)] animate-pulse" />
            <History className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Recent Workspace ({items.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {expanded && (
              <button
                onClick={clearAll}
                className="text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors"
              >
                Clear
              </button>
            )}
            <button className="p-1 text-[var(--text-secondary)]">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Quick Horizontal Chip Preview (when collapsed) */}
        {!expanded && (
          <div className="flex items-center gap-1.5 p-1.5 overflow-x-auto max-w-sm sm:max-w-md no-scrollbar">
            {items.slice(0, 4).map((item) => {
              const Icon = getItemIcon(item.type);
              const isActive = pathname === item.url;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => router.push(item.url)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[var(--accent-gold)] text-white border-[var(--accent-gold)]'
                      : 'bg-[var(--background)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--accent-gold)]/40'
                  }`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[120px]">{item.title}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Expanded Tray List */}
        {expanded && (
          <div className="p-2 space-y-1.5 max-h-64 overflow-y-auto">
            {items.map((item) => {
              const Icon = getItemIcon(item.type);
              const isActive = pathname === item.url;
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => {
                    router.push(item.url);
                    setExpanded(false);
                  }}
                  className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--text-primary)]'
                      : 'bg-[var(--background)] border-[var(--border)] hover:border-[var(--accent-gold)]/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-[var(--panel)] text-[var(--accent-gold)] border border-[var(--border)]">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-[10px] text-[var(--text-secondary)] truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => removeItem(e, item.id, item.type)}
                      className="p-1 text-[var(--text-secondary)] hover:text-[var(--error)] rounded-md transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
