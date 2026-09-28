'use client';

import { useEffect } from 'react';
import { Box } from '@mui/material';
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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'var(--background)',
        p: 3,
      }}
    >
      <Box sx={{ maxWidth: 560, width: '100%' }}>
        <EmptyState
          icon={<AlertTriangle className="w-12 h-12" />}
          title="Something went wrong"
          description={error.digest ? `Error reference: ${error.digest}` : 'Please try again. If the problem persists, contact support.'}
          action={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button variant="primary" onClick={() => reset()}>
                Try again
              </Button>
              <Button variant="outline" href="/">
                Back to home
              </Button>
            </Box>
          }
        />
      </Box>
    </Box>
  );
}
