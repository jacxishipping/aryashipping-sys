'use client';

import Link from 'next/link';
import { WifiOff, RefreshCcw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)]">
          <WifiOff className="h-10 w-10 text-[var(--text-secondary)]" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">You are offline</h1>
        <p className="mt-3 max-w-lg text-sm text-[var(--text-secondary)] sm:text-base">
          We cannot reach the network right now. You can retry when your connection is back.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--accent-gold)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <RefreshCcw className="h-4 w-4" />
            Retry
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
