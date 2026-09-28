"use client";

import { useState, useEffect } from 'react';
import { IconButton, Box } from '@mui/material';
import { LightMode, DarkMode } from '@mui/icons-material';
import Tooltip from './Tooltip';

/**
 * Theme Toggle Component
 * 
 * Switch between light and dark modes.
 * Persists preference in localStorage.
 */

export type Theme = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as Theme;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;
    
    setTheme(initialTheme);
    applyTheme(initialTheme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    if (newTheme === 'dark') {
      root.classList.add('dark-mode');
      root.classList.add('dark');
      root.classList.remove('light-mode');
    } else {
      root.classList.add('light-mode');
      root.classList.remove('dark-mode');
      root.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <Box sx={{ width: 40, height: 40 }} />
    );
  }

  return (
    <Tooltip title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
      <IconButton
        onClick={toggleTheme}
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        sx={{
          color: 'var(--text-secondary)',
          minWidth: { xs: 44, sm: 0 },
          minHeight: { xs: 44, sm: 0 },
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            color: 'var(--accent-gold)',
            bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
            transform: 'rotate(20deg)',
          },
          '&:active': {
            transform: 'rotate(20deg) scale(0.95)',
          },
        }}
      >
        {theme === 'light' ? (
          <LightMode sx={{ fontSize: 20 }} />
        ) : (
          <DarkMode sx={{ fontSize: 20 }} />
        )}
      </IconButton>
    </Tooltip>
  );
}
