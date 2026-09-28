'use client';

import { useEffect, useState } from 'react';
import { X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KeyboardShortcut, formatShortcut } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
  shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsModal({ shortcuts }: KeyboardShortcutsModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl animate-scale-in">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl shadow-2xl mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <Keyboard className="w-6 h-6 text-[var(--accent-gold)]" />
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Keyboard Shortcuts
              </h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--background)] transition-colors"
                    >
                      <span className="text-sm text-[var(--text-primary)]">
                        {shortcut.description}
                      </span>
                      <kbd className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--text-secondary)]">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Global Shortcuts */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                Global
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--background)] transition-colors">
                  <span className="text-sm text-[var(--text-primary)]">Open Command Palette</span>
                  <kbd className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--text-secondary)]">
                    ⌘ + K
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--background)] transition-colors">
                  <span className="text-sm text-[var(--text-primary)]">Show Keyboard Shortcuts</span>
                  <kbd className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--text-secondary)]">
                    ?
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--background)] transition-colors">
                  <span className="text-sm text-[var(--text-primary)]">Close Modal/Dialog</span>
                  <kbd className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--text-secondary)]">
                    ESC
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--background)] rounded-b-xl">
            <p className="text-xs text-[var(--text-secondary)] text-center">
              Press <kbd className="px-1.5 py-0.5 bg-[var(--panel)] border border-[var(--border)] rounded text-[var(--text-primary)]">?</kbd> anytime to view shortcuts
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
