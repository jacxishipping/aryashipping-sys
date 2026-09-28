import { Box } from '@mui/material';
import { SearchX } from 'lucide-react';
import { Button, EmptyState } from '@/components/design-system';

export default function RootNotFound() {
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
          icon={<SearchX className="w-12 h-12" />}
          title="Page not found"
          description="The page you're looking for doesn't exist or was moved."
          action={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button variant="primary" href="/">
                Back to home
              </Button>
              <Button variant="outline" href="/dashboard">
                Go to dashboard
              </Button>
            </Box>
          }
        />
      </Box>
    </Box>
  );
}
