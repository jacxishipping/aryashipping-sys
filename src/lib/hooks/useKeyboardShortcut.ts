"use client";

import { useEffect, useCallback } from 'react';

/**
 * Keyboard Shortcuts System
 * 
 * Custom hook for registering keyboard shortcuts.
 * Provides a consistent way to handle keyboard interactions.
 */

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;  // Cmd on Mac, Win on Windows
}

export interface KeyboardShortcutOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  description?: string;
}

// Check if event matches shortcut config
function matchesShortcut(event: KeyboardEvent, config: ShortcutConfig): boolean {
  const keyMatch = event.key.toLowerCase() === config.key.toLowerCase();
  const ctrlMatch = config.ctrl ? event.ctrlKey : !event.ctrlKey;
  const altMatch = config.alt ? event.altKey : !event.altKey;
  const shiftMatch = config.shift ? event.shiftKey : !event.shiftKey;
  const metaMatch = config.meta ? event.metaKey : !event.metaKey;

  return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch;
}

// Format shortcut for display
export function formatShortcut(config: ShortcutConfig): string {
  const parts: string[] = [];
  
  // Detect OS for proper key display
  const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  
  if (config.ctrl) parts.push(isMac ? '⌃' : 'Ctrl');
  if (config.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (config.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (config.meta) parts.push(isMac ? '⌘' : 'Win');
  
  parts.push(config.key.toUpperCase());
  
  return parts.join(isMac ? '' : '+');
}

// Main hook
export function useKeyboardShortcut(
  shortcut: ShortcutConfig | ShortcutConfig[],
  callback: (event: KeyboardEvent) => void,
  options: KeyboardShortcutOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
  } = options;

  const shortcuts = Array.isArray(shortcut) ? shortcut : [shortcut];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      const isContentEditable = target.isContentEditable;
      
      if (isInput || isContentEditable) return;

      // Check if any shortcut matches
      const match = shortcuts.some(config => matchesShortcut(event, config));

      if (match) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback(event);
      }
    },
    [shortcuts, callback, enabled, preventDefault]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

// Global shortcut registry for help menu
export class ShortcutRegistry {
  private static shortcuts: Map<string, { config: ShortcutConfig; description: string }> = new Map();

  static register(id: string, config: ShortcutConfig, description: string) {
    this.shortcuts.set(id, { config, description });
  }

  static unregister(id: string) {
    this.shortcuts.delete(id);
  }

  static getAll() {
    return Array.from(this.shortcuts.entries()).map(([id, data]) => ({
      id,
      ...data,
      formatted: formatShortcut(data.config),
    }));
  }

  static clear() {
    this.shortcuts.clear();
  }
}

// Hook that also registers the shortcut globally
export function useGlobalKeyboardShortcut(
  id: string,
  shortcut: ShortcutConfig,
  callback: (event: KeyboardEvent) => void,
  description: string,
  options?: KeyboardShortcutOptions
) {
  useEffect(() => {
    ShortcutRegistry.register(id, shortcut, description);
    return () => ShortcutRegistry.unregister(id);
  }, [id, shortcut, description]);

  useKeyboardShortcut(shortcut, callback, options);
}

// Common shortcuts
export const commonShortcuts = {
  save: { key: 's', ctrl: true } as ShortcutConfig,
  search: { key: 'k', ctrl: true } as ShortcutConfig,
  help: { key: '?', shift: true } as ShortcutConfig,
  escape: { key: 'Escape' } as ShortcutConfig,
  enter: { key: 'Enter' } as ShortcutConfig,
  delete: { key: 'Delete' } as ShortcutConfig,
  copy: { key: 'c', ctrl: true } as ShortcutConfig,
  paste: { key: 'v', ctrl: true } as ShortcutConfig,
  undo: { key: 'z', ctrl: true } as ShortcutConfig,
  redo: { key: 'y', ctrl: true } as ShortcutConfig,
  selectAll: { key: 'a', ctrl: true } as ShortcutConfig,
  newItem: { key: 'n', ctrl: true } as ShortcutConfig,
  refresh: { key: 'r', ctrl: true } as ShortcutConfig,
} as const;

/**
 * Usage Examples:
 * 
 * @example
 * // Simple shortcut
 * useKeyboardShortcut({ key: 's', ctrl: true }, () => {
 *   console.log('Save triggered');
 * });
 * 
 * @example
 * // Multiple shortcuts for same action
 * useKeyboardShortcut(
 *   [
 *     { key: 's', ctrl: true },
 *     { key: 's', meta: true }
 *   ],
 *   () => handleSave()
 * );
 * 
 * @example
 * // Global shortcut with registry
 * useGlobalKeyboardShortcut(
 *   'save-shipment',
 *   { key: 's', ctrl: true },
 *   () => handleSave(),
 *   'Save shipment'
 * );
 * 
 * @example
 * // Conditional shortcut
 * useKeyboardShortcut(
 *   { key: 'Escape' },
 *   () => closeModal(),
 *   { enabled: isModalOpen }
 * );
 */
