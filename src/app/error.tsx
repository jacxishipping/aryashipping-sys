'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, EmptyState } from '@/components/design-system';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App route error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-6">
      <div className="max-w-[560px] w-full">
        <EmptyState
          icon={<AlertTriangle className="w-12 h-12" />}
          title="Something went wrong"
          description={error.digest ? `Error reference: ${error.digest}` : 'Please try again. If the problem persists, contact support.'}
          action={
            <div className="flex gap-2 flex-wrap justify-center">
              <Button variant="primary" onClick={() => reset()}>
                Try again
              </Button>
              <Button variant="outline" href="/">
                Back to home
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}
