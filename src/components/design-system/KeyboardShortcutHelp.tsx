"use client";

import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { Keyboard } from '@mui/icons-material';
import Modal from './Modal';
import { useKeyboardShortcut, ShortcutRegistry } from '@/lib/hooks/useKeyboardShortcut';

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
    { enabled: open }
  );

  // Listen for custom event from Header
  useEffect(() => {
    const handleToggle = () => setOpen(prev => !prev);
    window.addEventListener('toggle-shortcut-help', handleToggle);
    return () => window.removeEventListener('toggle-shortcut-help', handleToggle);
  }, []);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      size="lg"
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Keyboard sx={{ color: 'var(--accent-gold)' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            Keyboard Shortcuts
          </Typography>
        </Box>
      }
      description="Global shortcuts are listed first, followed by any page-specific shortcuts currently registered."
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {defaultShortcuts.map((category) => (
            <Box key={category.name}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  mb: 2,
                }}
              >
                {category.name}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {category.shortcuts.map((shortcut) => (
                  <Box
                    key={shortcut.key}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {shortcut.description}
                    </Typography>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1.5,
                        bgcolor: 'var(--background)',
                        border: '1px solid var(--border)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {shortcut.key}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}

          {/* Dynamic shortcuts from registry */}
          {ShortcutRegistry.getAll().length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  mb: 2,
                }}
              >
                Page Specific
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {ShortcutRegistry.getAll().map((shortcut) => (
                  <Box
                    key={shortcut.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {shortcut.description}
                    </Typography>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1.5,
                        bgcolor: 'var(--background)',
                        border: '1px solid var(--border)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {shortcut.formatted}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
      </Box>
    </Modal>
  );
}
