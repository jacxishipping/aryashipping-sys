'use client';

import { Moon, Sun } from 'lucide-react';
import { IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <IconButton
        size="small"
        sx={{
          color: 'var(--text-secondary)',
          p: 1,
        }}
      >
        <div className="w-5 h-5" />
      </IconButton>
    );
  }

  return (
    <Tooltip title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
      <IconButton
        onClick={toggleTheme}
        size="small"
        sx={{
          color: 'var(--text-secondary)',
          p: 1,
          '&:hover': {
            bgcolor: 'rgba(var(--border-rgb), 0.4)',
            color: 'var(--text-primary)',
          },
        }}
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <Moon className="w-5 h-5" />
        ) : (
          <Sun className="w-5 h-5" />
        )}
      </IconButton>
    </Tooltip>
  );
}
