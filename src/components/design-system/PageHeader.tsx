"use client";

import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';
import Breadcrumbs from './Breadcrumbs';
import { useTheme } from '@/hooks/useTheme';

interface PageHeaderProps {
	title: string;
	description?: string;
	actions?: ReactNode;
	showBreadcrumbs?: boolean;
	className?: string;
	meta?: Array<{
		label: string;
		value: string | number;
		helper?: string;
		intent?: 'default' | 'positive' | 'warning' | 'critical';
	}>;
}

export type { PageHeaderProps };
export type PageHeaderMeta = NonNullable<PageHeaderProps['meta']>[number];

const metaIntentTextColor: Record<NonNullable<PageHeaderMeta['intent']>, string> = {
	default: 'var(--text-primary)',
	positive: 'var(--success-dark)',
	warning: 'var(--warning-dark)',
	critical: 'var(--error-dark)',
};

export default function PageHeader({ title, description, actions, showBreadcrumbs = false, className, meta }: PageHeaderProps) {
	const { density } = useTheme();
	const isCompact = density === 'compact';

	return (
		<Box className={['page-header-root', className].filter(Boolean).join(' ')} sx={{ mb: isCompact ? 1.5 : 3 }}>
			{showBreadcrumbs && (
				<Box sx={{ mb: isCompact ? 0.75 : 1.5 }}>
					<Breadcrumbs />
				</Box>
			)}
			<Box
				sx={{
					display: 'flex',
					flexDirection: { xs: 'column', md: 'row' },
					justifyContent: 'space-between',
					alignItems: { xs: 'flex-start', md: 'center' },
					gap: isCompact ? 1.25 : 2,
					border: '1px solid var(--border)',
					borderTop: '2px solid rgba(var(--accent-gold-rgb), 0.3)',
					borderRadius: isCompact ? 1.5 : 2,
					backgroundColor: 'var(--panel)',
					boxShadow: 'var(--shadow-header)',
					padding: isCompact
						? { xs: '8px 12px', md: '10px 14px' }
						: { xs: '14px 16px', md: '16px 18px' },
				}}
			>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
					<Typography
						component="h1"
						sx={{
							fontSize: { xs: '1.15rem', sm: '1.25rem', md: '1.4rem' },
							fontWeight: 600,
							color: 'var(--text-primary)',
							lineHeight: 1.2,
							overflowWrap: 'anywhere',
						}}
					>
						{title}
					</Typography>
					{description && (
						<Typography
							sx={{
								fontSize: { xs: '0.82rem', sm: '0.88rem' },
								color: 'var(--text-secondary)',
								maxWidth: 680,
							}}
						>
							{description}
						</Typography>
					)}
				</Box>
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
					{meta && meta.length > 0 && (
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
							{meta.map((item) => (
								<Box
									key={item.label}
									sx={{
										minWidth: isCompact ? 90 : 110,
										border: '1px solid var(--border)',
										borderRadius: 1.25,
										padding: isCompact ? '4px 8px' : '8px 12px',
										backgroundColor: 'var(--background)',
									}}
								>
									<Typography
										sx={{
											fontSize: '0.65rem',
											textTransform: 'uppercase',
											letterSpacing: '0.15em',
											color: 'var(--text-secondary)',
										}}
									>
										{item.label}
									</Typography>
									<Typography sx={{ fontSize: isCompact ? '0.875rem' : '1rem', fontWeight: 600, color: metaIntentTextColor[item.intent ?? 'default'] }}>
										{item.value}
									</Typography>
									{item.helper && (
										<Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
											{item.helper}
										</Typography>
									)}
								</Box>
							))}
						</Box>
					)}
					{actions && <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{actions}</Box>}
				</Box>
			</Box>
		</Box>
	);
}
