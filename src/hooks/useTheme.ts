'use client';

import { useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type DensityMode = 'comfortable' | 'compact';

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [density, setDensityState] = useState<DensityMode>('comfortable');
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((mode: ThemeMode) => {
    const resolved = mode === 'system' ? getSystemTheme() : mode;
    setResolvedTheme(resolved);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolved);
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const applyDensity = useCallback((dens: DensityMode) => {
    setDensityState(dens);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-density', dens);
      if (dens === 'compact') {
        document.documentElement.classList.add('density-compact');
      } else {
        document.documentElement.classList.remove('density-compact');
      }
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const storedTheme = (localStorage.getItem('theme') as ThemeMode) || 'light';
    const storedDensity = (localStorage.getItem('density') as DensityMode) || 'comfortable';
    
    setThemeState(storedTheme);
    applyTheme(storedTheme);
    applyDensity(storedDensity);

    // Listen to system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const currentStored = (localStorage.getItem('theme') as ThemeMode) || 'light';
      if (currentStored === 'system') {
        applyTheme('system');
      }
    };

    // Listen to storage events across tabs or components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        const newTheme = e.newValue as ThemeMode;
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
      if (e.key === 'density' && e.newValue) {
        const newDensity = e.newValue as DensityMode;
        setDensityState(newDensity);
        applyDensity(newDensity);
      }
    };

    const handleCustomThemeChange = ((e: CustomEvent<ThemeMode>) => {
      if (e.detail) {
        setThemeState(e.detail);
        applyTheme(e.detail);
      }
    }) as EventListener;

    const handleCustomDensityChange = ((e: CustomEvent<DensityMode>) => {
      if (e.detail) {
        setDensityState(e.detail);
        applyDensity(e.detail);
      }
    }) as EventListener;

    mediaQuery.addEventListener('change', handleSystemChange);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('theme-changed', handleCustomThemeChange);
    window.addEventListener('density-changed', handleCustomDensityChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('theme-changed', handleCustomThemeChange);
      window.removeEventListener('density-changed', handleCustomDensityChange);
    };
  }, [applyTheme, applyDensity]);

  const setTheme = useCallback(
    (newTheme: ThemeMode) => {
      setThemeState(newTheme);
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: newTheme }));
      }
    },
    [applyTheme]
  );

  const setDensity = useCallback(
    (newDensity: DensityMode) => {
      setDensityState(newDensity);
      if (typeof window !== 'undefined') {
        localStorage.setItem('density', newDensity);
        applyDensity(newDensity);
        window.dispatchEvent(new CustomEvent('density-changed', { detail: newDensity }));
      }
    },
    [applyDensity]
  );

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  const toggleDensity = useCallback(() => {
    const next = density === 'comfortable' ? 'compact' : 'comfortable';
    setDensity(next);
  }, [density, setDensity]);

  return {
    theme,
    resolvedTheme,
    density,
    toggleTheme,
    toggleDensity,
    setTheme,
    setDensity,
    mounted,
  };
}

export function setGlobalTheme(theme: ThemeMode) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('theme', theme);
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    document.documentElement.setAttribute('data-theme', resolved);
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: theme }));
  }
}

export function setGlobalDensity(density: DensityMode) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('density', density);
    document.documentElement.setAttribute('data-density', density);
    if (density === 'compact') {
      document.documentElement.classList.add('density-compact');
    } else {
      document.documentElement.classList.remove('density-compact');
    }
    window.dispatchEvent(new CustomEvent('density-changed', { detail: density }));
  }
}
