import { Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';
import { TelegramAppClient } from '@/components/telegram/TelegramAppClient';

export const dynamic = 'force-dynamic';

export default function TelegramAliasPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100vh',
            bgcolor: '#0a0d14',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress sx={{ color: '#D4AF37' }} />
        </Box>
      }
    >
      <TelegramAppClient />
    </Suspense>
  );
}
