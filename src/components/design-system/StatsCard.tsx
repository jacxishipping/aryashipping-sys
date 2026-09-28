"use client";

import { Box, Typography, Fade } from '@mui/material';
import { ReactNode, useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

/**
 * StatsCard Component
 * 
 * Display key metrics with icons, values, and optional trends.
 * Now uses design tokens for consistent styling.
 */

interface StatsCardProps {
	icon: ReactNode;
	title: string;
	value: string | number;
	subtitle?: string;
	compactValue?: string | number;
	trend?: {
		value: number;
		isPositive: boolean;
	};
	variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
	size?: 'sm' | 'md' | 'lg';
	delay?: number;
}

export default function StatsCard({
	icon,
	title,
	value,
	subtitle,
	compactValue,
	trend,
	variant = 'default',
	size = 'md',
	delay = 0,
}: StatsCardProps) {
	const { density } = useTheme();
	const isCompact = density === 'compact';
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsVisible(true);
		}, delay * 1000);
		return () => clearTimeout(timer);
	}, [delay]);

	// Variant colors
	const variantConfig = {
		default: {
			iconColor: 'var(--accent-gold)',
			iconBg: 'rgba(var(--accent-gold-rgb), 0.15)',
		},
		secondary: {
			iconColor: 'var(--text-primary)',
			iconBg: 'rgba(var(--text-secondary-rgb), 0.12)',
		},
		success: {
			iconColor: 'var(--success)',
			iconBg: 'rgba(var(--success-rgb), 0.15)',
		},
		warning: {
			iconColor: 'var(--warning)',
			iconBg: 'rgba(var(--warning-rgb), 0.15)',
		},
		error: {
			iconColor: 'var(--error)',
			iconBg: 'rgba(var(--error-rgb), 0.15)',
		},
		info: {
			iconColor: 'var(--info)',
			iconBg: 'rgba(var(--info-rgb), 0.15)',
		},
	};

	const sizeConfig = isCompact
		? {
				sm: { iconSize: 26, padding: 1, fontSize: '0.95rem' },
				md: { iconSize: 32, padding: 1.25, fontSize: '1.15rem' },
				lg: { iconSize: 38, padding: 1.5, fontSize: '1.3rem' },
		  }
		: {
				sm: { iconSize: 36, padding: 1.5, fontSize: '1.125rem' },
				md: { iconSize: 48, padding: 2, fontSize: '1.5rem' },
				lg: { iconSize: 56, padding: 2.5, fontSize: '1.75rem' },
		  };

	const colors = variantConfig[variant];
	const sizes = sizeConfig[size];
	const isNeutralTrend = trend?.value === 0;
	const trendColor = isNeutralTrend
		? 'var(--text-secondary)'
		: trend?.isPositive
			? 'var(--success-dark)'
			: 'var(--error-dark)';
	const trendBorderColor = isNeutralTrend
		? 'var(--border)'
		: trend?.isPositive
			? 'var(--success)'
			: 'var(--error)';
	const trendBackground = isNeutralTrend
		? 'var(--panel)'
		: trend?.isPositive
			? 'rgba(var(--success-rgb), 0.12)'
			: 'rgba(var(--error-rgb), 0.12)';
	const trendPrefix = isNeutralTrend ? '' : trend?.isPositive ? '+' : '−';

	return (
		<Fade in={isVisible} timeout={600}>
			<Box
				component="article"
				className="stats-card hover-lift"
				sx={{
				height: '100%',
				borderRadius: isCompact ? 1.5 : 2,
				border: '1px solid var(--border)',
				borderLeft: variant === 'default' ? '3px solid var(--accent-gold)' : undefined,
				background: 'var(--panel)',
				padding: sizes.padding,
			display: 'flex',
				alignItems: 'center',
				gap: isCompact ? 1 : 1.5,
				position: 'relative',
				zIndex: 1,
				overflow: 'hidden',
				minWidth: 0,
				width: '100%',
				boxSizing: 'border-box',
				boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
				'&:hover': {
					zIndex: 2,
				},
				}}
			>
				<Box
					sx={{
						width: sizes.iconSize,
						height: sizes.iconSize,
						borderRadius: 3,
						border: '1px solid var(--border)',
						background: colors.iconBg,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0,
						color: colors.iconColor,
						position: 'relative',
						overflow: 'hidden',
						'&::after': {
							content: '""',
							position: 'absolute',
							inset: 0,
							background: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.08), transparent 72%)',
							pointerEvents: 'none',
						},
						'& > *': {
							position: 'relative',
							zIndex: 1,
						},
					}}
				>
					{icon}
				</Box>
				<Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
					<Typography
						sx={{
							fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
							textTransform: 'uppercase',
							letterSpacing: '0.15em',
							color: 'var(--text-secondary)',
							marginBottom: 0.5,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
						}}
					>
						{title}
					</Typography>
					<Typography
						component="span"
						title={typeof value === 'string' && value.length > 12 ? value : undefined}
						sx={{
							fontSize: sizes.fontSize,
							fontWeight: 700,
							color: 'var(--text-primary)',
							lineHeight: 1.15,
							width: '100%',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
						}}
					>
						{compactValue || value}
					</Typography>
					{subtitle && (
						<Typography
							sx={{
								fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' },
								color: 'var(--text-secondary)',
								marginTop: 0.25,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{subtitle}
						</Typography>
					)}
				</Box>
				{trend && (
					<Box
						aria-label={`Trend: ${trendPrefix}${Math.abs(trend.value)}% ${
							isNeutralTrend ? 'no change' : trend.isPositive ? 'increase' : 'decrease'
						}`}
						sx={{
							fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
							fontWeight: 700,
							px: 1,
							py: 0.5,
							borderRadius: '999px',
							color: trendColor,
							border: `1px solid ${trendBorderColor}`,
							background: trendBackground,
							flexShrink: 0,
						}}
					>
						{trendPrefix}
						{Math.abs(trend.value)}%
					</Box>
				)}
			</Box>
		</Fade>
	);
}
