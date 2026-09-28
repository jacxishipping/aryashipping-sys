"use client";

import { Box, Typography } from '@mui/material';
import { CompactSkeleton } from './PageSkeletons';

interface LoadingStateProps {
	message?: string;
	fullScreen?: boolean;
}

export default function LoadingState({ message = 'Loading...', fullScreen = false }: LoadingStateProps) {
	if (fullScreen) {
		return (
			<Box sx={{ minHeight: '100vh', width: '100%', bgcolor: 'var(--background)' }}>
				{/* We use CompactSkeleton but centered or replicated to mimic full screen load if needed, 
            or ideally Import DashboardPageSkeleton but that might cause circular deps if not careful.
            Since PageSkeletons exports multiple, let's just use a simple Box structure here or generic skeleton.
            Actually, let's just use CompactSkeleton for now as a generic replacement for the spinner.
         */}
				<Box sx={{ p: 4, maxWidth: 800, mx: 'auto', pt: 10 }}>
          <CompactSkeleton />
          <Box sx={{ mt: 4 }}>
            <CompactSkeleton />
          </Box>
        </Box>
			</Box>
		);
	}

	return (
		<Box
			sx={{
				width: '100%',
				minHeight: 200,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<Box sx={{ width: '100%', maxWidth: 400 }}>
        <CompactSkeleton />
      </Box>
      {message && message !== 'Loading...' && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
          {message}
        </Typography>
      )}
		</Box>
	);
}
