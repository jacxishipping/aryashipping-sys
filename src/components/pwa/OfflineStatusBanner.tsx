'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export default function OfflineStatusBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div className="sticky top-0 z-[1000] border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
          <WifiOff className="h-4 w-4 text-[var(--error)]" />
          <span>You are offline. Some features may be unavailable.</span>
        </div>
        <Link
          href="/offline"
          className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
        >
          Offline page
        </Link>
      </div>
    </div>
  );
}
