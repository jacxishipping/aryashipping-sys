'use client';

import { useEffect } from 'react';
import { Box } from '@mui/material';
import { AlertTriangle } from 'lucide-react';
import { DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, PageHeader } from '@/components/design-system';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Portal route error:', error);
  }, [error]);

  return (
    <DashboardSurface>
      <PageHeader title="Something went wrong" description="This portal page hit an unexpected error." />
      <EmptyState
        icon={<AlertTriangle className="w-12 h-12" />}
        title="We couldn't load this page"
        description={error.digest ? `Error reference: ${error.digest}` : 'Please try again. If the problem persists, contact support.'}
        action={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button variant="primary" onClick={() => reset()}>
              Try again
            </Button>
            <Button variant="outline" href="/portal">
              Back to workspaces
            </Button>
          </Box>
        }
      />
    </DashboardSurface>
  );
}
