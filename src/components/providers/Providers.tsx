'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from './ThemeProvider';
import { Toaster } from 'sonner';
import { CommandPaletteProvider } from './CommandPaletteProvider';
import i18n from '@/lib/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: (failureCount) => {
              if (failureCount < 3) {
                return true;
              }
              return false;
            },
          },
        },
      })
  );

  return (
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <CommandPaletteProvider>
            {children}
            <Toaster 
              position="top-right"
              expand={false}
              richColors
              closeButton
              theme="light"
              toastOptions={{
                style: {
                  background: 'var(--panel)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                },
                className: 'toast-custom',
              }}
            />
            <ReactQueryDevtools initialIsOpen={false} />
          </CommandPaletteProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </ThemeProvider>
  );
}