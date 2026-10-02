'use client';

import { useTheme } from '@/hooks/useTheme';
import { ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { mounted } = useTheme();

  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}