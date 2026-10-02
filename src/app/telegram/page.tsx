import { Suspense } from 'react';
import { TelegramAppClient } from '@/components/telegram/TelegramAppClient';

export const dynamic = 'force-dynamic';

export default function TelegramAliasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-gold)] border-t-transparent animate-spin" />
        </div>
      }
    >
      <TelegramAppClient />
    </Suspense>
  );
}
