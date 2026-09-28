'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  Keyboard, 
  X, 
  Search, 
  Layers, 
  QrCode, 
  SlidersHorizontal, 
  PanelRight, 
  ArrowUpDown,
  SunMoon,
  Maximize2,
  Minimize2,
  FileText
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface ShortcutCategory {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
    icon?: any;
  }[];
}

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);
  const { toggleTheme, toggleDensity } = useTheme();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing inside inputs, textareas, or contentEditable
    const activeTag = (document.activeElement?.tagName || '').toLowerCase();
    const isInput = activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;

    if (e.key === '?' && !isInput) {
      e.preventDefault();
      setOpen((prev) => !prev);
    } else if (e.key === 'Escape' && open) {
      setOpen(false);
    }
  }, [open]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const categories: ShortcutCategory[] = [
    {
      title: 'Global & Navigation',
      shortcuts: [
        { keys: ['Ctrl', 'K'], description: 'Open Universal Command Palette', icon: Search },
        { keys: ['?'], description: 'Toggle Keyboard Shortcuts Cheat Sheet', icon: Keyboard },
        { keys: ['Esc'], description: 'Close modals, drawers, or command palette', icon: X },
      ],
    },
    {
      title: 'Theme & Display Scaling',
      shortcuts: [
        { keys: ['Ctrl', 'Shift', 'T'], description: 'Toggle Dark / Light Theme Mode', icon: SunMoon },
        { keys: ['Ctrl', 'Shift', 'D'], description: 'Toggle Compact / Comfort Density', icon: Maximize2 },
      ],
    },
    {
      title: 'Logistics Operations & Records',
      shortcuts: [
        { keys: ['Space'], description: 'Quick Peek active shipment or container drawer', icon: PanelRight },
        { keys: ['Q'], description: 'Open Thermal 4x6" Yard QR Label generator', icon: QrCode },
        { keys: ['J', '/', 'K'], description: 'Navigate next / previous record in tables', icon: ArrowUpDown },
        { keys: ['M'], description: 'Open Live Ocean Route & Vessel Map', icon: Layers },
        { keys: ['O'], description: 'Open Drag & Drop Operations Board', icon: Layers },
      ],
    },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-gold)] text-white shadow-sm">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Keyboard Shortcuts & Power Tools
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Boost your logistics workflow speed with hotkeys
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {categories.map((cat, catIdx) => (
            <div key={catIdx} className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                {cat.title}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {cat.shortcuts.map((sc, scIdx) => {
                  const Icon = sc.icon;
                  return (
                    <div
                      key={scIdx}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)]/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {Icon && <Icon className="w-4 h-4 text-[var(--accent-gold)]" />}
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {sc.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {sc.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="px-2 py-1 text-xs font-mono font-bold rounded-md bg-[var(--panel)] border border-[var(--border)] text-[var(--text-primary)] shadow-sm"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-secondary)]">
          <span>Press <kbd className="px-1.5 py-0.5 font-mono text-[10px] font-bold rounded bg-[var(--panel)] border border-[var(--border)]">?</kbd> anywhere to toggle this window</span>
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-[var(--accent-gold)] text-white hover:opacity-90 transition-opacity"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
