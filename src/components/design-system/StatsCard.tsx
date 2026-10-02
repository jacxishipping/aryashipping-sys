"use client";

import { ReactNode, useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

/**
 * StatsCard Component
 * 
 * Display key metrics with icons, values, and optional trends.
 * Now uses design tokens for consistent styling.
 */

export interface StatsCardProps {
	icon: ReactNode;
	title: string;
	value: string | number;
	subtitle?: string;
	compactValue?: string | number;
	trend?: {
		value: number;
		isPositive: boolean;
	};
	variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'primary';
	size?: 'sm' | 'md' | 'lg';
	delay?: number;
	iconColor?: string;
	iconBg?: string;
	className?: string;
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
	iconColor: customIconColor,
	iconBg: customIconBg,
	className = '',
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
		primary: {
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
				sm: { iconSize: 'w-6 h-6', padding: 'p-2', fontSize: 'text-sm' },
				md: { iconSize: 'w-8 h-8', padding: 'p-2.5', fontSize: 'text-base' },
				lg: { iconSize: 'w-9 h-9', padding: 'p-3', fontSize: 'text-lg' },
		  }
		: {
				sm: { iconSize: 'w-9 h-9', padding: 'p-3', fontSize: 'text-base' },
				md: { iconSize: 'w-12 h-12', padding: 'p-4', fontSize: 'text-xl' },
				lg: { iconSize: 'w-14 h-14', padding: 'p-5', fontSize: 'text-2xl' },
		  };

	const normalizedVariant = variant === 'primary' ? 'default' : variant;
	const colors = variantConfig[normalizedVariant] || variantConfig.default;
	const sizes = sizeConfig[size] || sizeConfig.md;
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

	const activeIconColor = customIconColor || colors.iconColor;
	const activeIconBg = customIconBg || colors.iconBg;

	return (
		<article
			className={`stats-card relative z-[1] hover:z-[2] h-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] ${sizes.padding} flex items-center gap-3 overflow-hidden min-w-0 w-full box-border shadow-sm hover:shadow-md transition-all ${
				variant === 'default' ? 'border-l-4 border-l-[var(--accent-gold)]' : ''
			} ${className} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all duration-500`}
		>
			<div
				className={`${sizes.iconSize} rounded-xl border border-[var(--border)] flex items-center justify-center flex-shrink-0 relative overflow-hidden`}
				style={{ backgroundColor: activeIconBg, color: activeIconColor }}
			>
				{icon}
			</div>

			<div className="flex-1 min-w-0 overflow-hidden">
				<p className="text-[0.7rem] uppercase tracking-wider text-[var(--text-secondary)] mb-0.5 truncate font-medium">
					{title}
				</p>
				<span
					title={typeof value === 'string' && value.length > 12 ? value : undefined}
					className={`${sizes.fontSize} font-bold text-[var(--text-primary)] leading-tight block truncate`}
				>
					{compactValue || value}
				</span>
				{subtitle && (
					<p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
						{subtitle}
					</p>
				)}
			</div>

			{trend && (
				<div
					aria-label={`Trend: ${trendPrefix}${Math.abs(trend.value)}% ${
						isNeutralTrend ? 'no change' : trend.isPositive ? 'increase' : 'decrease'
					}`}
					className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
					style={{
						color: trendColor,
						border: `1px solid ${trendBorderColor}`,
						backgroundColor: trendBackground,
					}}
				>
					{trendPrefix}
					{Math.abs(trend.value)}%
				</div>
			)}
		</article>
	);
}
