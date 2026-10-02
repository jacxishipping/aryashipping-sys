'use client';

import { Moon, Sun } from 'lucide-react';
import Tooltip from '@/components/design-system/Tooltip';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <div className="p-2 w-9 h-9 flex items-center justify-center">
        <div className="w-5 h-5" />
      </div>
    );
  }

  return (
    <Tooltip title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
      <button
        onClick={toggleTheme}
        className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--border-rgb),0.4)] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <Moon className="w-5 h-5" />
        ) : (
          <Sun className="w-5 h-5" />
        )}
      </button>
    </Tooltip>
  );
}
