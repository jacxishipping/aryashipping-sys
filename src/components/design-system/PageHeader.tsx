"use client";

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

export default function PageHeader({ title, description, actions, showBreadcrumbs = false, className = '', meta }: PageHeaderProps) {
	const { density } = useTheme();
	const isCompact = density === 'compact';

	return (
		<div className={`page-header-root ${isCompact ? 'mb-3' : 'mb-6'} ${className}`}>
			{showBreadcrumbs && (
				<div className={isCompact ? 'mb-2' : 'mb-3'}>
					<Breadcrumbs />
				</div>
			)}
			<div
				className={`flex flex-col md:flex-row justify-between items-start md:items-center ${
					isCompact ? 'gap-3 p-3' : 'gap-4 p-4 md:p-5'
				} border border-[var(--border)] rounded-2xl bg-[var(--panel)] shadow-sm`}
				style={{
					borderTop: '2px solid rgba(var(--accent-gold-rgb), 0.3)',
				}}
			>
				<div className="flex flex-col gap-1 min-w-0">
					<h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] leading-tight tracking-tight">
						{title}
					</h1>
					{description && (
						<p className="text-xs md:text-sm text-[var(--text-secondary)] max-w-2xl">
							{description}
						</p>
					)}
				</div>
				<div className="flex flex-wrap gap-3 items-center justify-start md:justify-end">
					{meta && meta.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{meta.map((item) => (
								<div
									key={item.label}
									className={`${
										isCompact ? 'min-w-[90px] px-2 py-1' : 'min-w-[110px] px-3 py-2'
									} border border-[var(--border)] rounded-xl bg-[var(--background)]`}
								>
									<p className="text-[0.65rem] uppercase tracking-wider text-[var(--text-secondary)] font-medium">
										{item.label}
									</p>
									<p
										className={`${
											isCompact ? 'text-sm' : 'text-base'
										} font-bold leading-tight`}
										style={{ color: metaIntentTextColor[item.intent ?? 'default'] }}
									>
										{item.value}
									</p>
									{item.helper && (
										<p className="text-[0.6875rem] text-[var(--text-secondary)]">
											{item.helper}
										</p>
									)}
								</div>
							))}
						</div>
					)}
					{actions && <div className="flex flex-wrap gap-2 items-center">{actions}</div>}
				</div>
			</div>
		</div>
	);
}
