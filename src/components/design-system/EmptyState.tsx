"use client";

import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface EmptyStateProps {
	icon: ReactNode;
	title: string;
	description?: string;
	action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
	return (
		<Box
			className="animate-fade-in-up"
			sx={{
				minHeight: 240,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 1.5,
				textAlign: 'center',
				py: 4,
			}}
		>
			<Box
				sx={{
					width: 72,
					height: 72,
					borderRadius: '50%',
					background: 'rgba(var(--accent-gold-rgb), 0.08)',
					border: '1px solid rgba(var(--accent-gold-rgb), 0.2)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color: 'var(--accent-gold)',
					opacity: 0.7,
					'& svg': {
						fontSize: { xs: 42, sm: 48, md: 56 },
					},
				}}
			>
				{icon}
			</Box>
			<Typography
				sx={{
					fontSize: { xs: '0.98rem', sm: '1rem', md: '1.05rem' },
					fontWeight: 600,
					color: 'var(--text-primary)',
				}}
			>
				{title}
			</Typography>
			{description && (
				<Typography
					sx={{
						fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.9rem' },
						color: 'var(--text-secondary)',
						maxWidth: 400,
					}}
				>
					{description}
				</Typography>
			)}
			{action && <Box sx={{ mt: 1 }}>{action}</Box>}
		</Box>
	);
}
