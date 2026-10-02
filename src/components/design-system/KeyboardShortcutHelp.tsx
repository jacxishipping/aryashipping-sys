"use client";

import { useState } from 'react';
import { Keyboard } from 'lucide-react';
import Modal from './Modal';
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut';

interface ShortcutCategory {
  name: string;
  shortcuts: Array<{
    key: string;
    description: string;
  }>;
}

const defaultShortcuts: ShortcutCategory[] = [
  {
    name: 'General',
    shortcuts: [
      { key: '?', description: 'Show keyboard shortcuts' },
      { key: 'Ctrl+K', description: 'Open search' },
      { key: 'Esc', description: 'Close dialog/modal' },
      { key: 'Ctrl+/', description: 'Toggle sidebar' },
    ],
  },
  {
    name: 'Navigation',
    shortcuts: [
      { key: 'G → D', description: 'Go to Dashboard' },
      { key: 'G → S', description: 'Go to Shipments' },
      { key: 'G → C', description: 'Go to Containers' },
      { key: 'G → V', description: 'Go to Vehicles' },
    ],
  },
  {
    name: 'Actions',
    shortcuts: [
      { key: 'Ctrl+S', description: 'Save changes' },
      { key: 'Ctrl+N', description: 'Create new item' },
      { key: 'Ctrl+R', description: 'Refresh data' },
      { key: 'Delete', description: 'Delete selected item' },
    ],
  },
];

export default function KeyboardShortcutHelp() {
  const [open, setOpen] = useState(false);

  // Show help on ? key
  useKeyboardShortcut(
    { key: '?', shift: true },
    () => setOpen(true),
    { description: 'Show keyboard shortcuts' }
  );

  // Close on Escape
  useKeyboardShortcut(
    { key: 'Escape' },
    () => setOpen(false),
    { description: 'Close keyboard shortcuts' }
  );

  return (
    <>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-[var(--accent-gold)]" />
            <span>Keyboard Shortcuts</span>
          </div>
        }
        description="Navigate and perform actions faster with keyboard shortcuts"
        size="md"
      >
        <div className="flex flex-col gap-6 py-2">
          {defaultShortcuts.map((category) => (
            <div key={category.name}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                {category.name}
              </h3>
              <div className="flex flex-col gap-2">
                {category.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[rgba(var(--accent-gold-rgb),0.05)] transition-colors"
                  >
                    <span className="text-sm text-[var(--text-primary)]">
                      {shortcut.description}
                    </span>
                    <kbd className="px-2 py-1 text-xs font-mono font-semibold rounded bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] shadow-sm">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="border-t border-[var(--border)] pt-4 text-xs text-center text-[var(--text-secondary)]">
            Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] font-mono">?</kbd> anywhere to open this dialog
          </div>
        </div>
      </Modal>
    </>
  );
}
