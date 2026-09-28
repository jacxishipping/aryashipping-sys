import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/design-system/PageHeader';

type DashboardSurfaceProps = {
	children: ReactNode;
	className?: string;
	noPadding?: boolean;
};

export function DashboardSurface({ children, className, noPadding = false }: DashboardSurfaceProps) {
	return (
		<div
			className={cn(
				'dashboard-surface relative mx-auto flex w-full max-w-[1380px] flex-col gap-6 px-4 pt-4 pb-4 sm:px-5 lg:px-8',
				'text-[var(--text-primary)]',
				'min-w-0 overflow-hidden',
				'animate-fade-in-up', // Added global animation
				noPadding && 'px-0 sm:px-0',
				className,
			)}
			style={{ backgroundColor: 'var(--background)' }}
		>
			{children}
		</div>
	);
}

type DashboardHeaderMeta = {
	label: string;
	value: string | number;
	helper?: string;
	intent?: 'default' | 'positive' | 'warning' | 'critical';
};

interface DashboardHeaderProps {
	title: string;
	description?: string;
	meta?: DashboardHeaderMeta[];
	actions?: ReactNode;
	className?: string;
	showBreadcrumbs?: boolean;
}

export type { DashboardHeaderProps, DashboardHeaderMeta };

/**
 * Canonical page header lives in the design system (`PageHeader`).
 * This wrapper preserves the legacy `DashboardHeader` import path while
 * rendering the same markup, spacing, and meta semantics everywhere.
 */
export function DashboardHeader({ title, description, meta, actions, className, showBreadcrumbs = false }: DashboardHeaderProps) {
	return (
		<PageHeader
			title={title}
			description={description}
			meta={meta}
			actions={actions}
			className={cn('dashboard-header', className)}
			showBreadcrumbs={showBreadcrumbs}
		/>
	);
}

interface DashboardPanelProps {
	title?: ReactNode;
	description?: ReactNode;
	children: ReactNode;
	actions?: ReactNode;
	className?: string;
	bodyClassName?: string;
	noHeaderBorder?: boolean;
	noBodyPadding?: boolean;
	fullHeight?: boolean;
	footer?: ReactNode;
}

export function DashboardPanel({
	title,
	description,
	children,
	actions,
	className,
	bodyClassName,
	noHeaderBorder = false,
	noBodyPadding = false,
	fullHeight = false,
	footer,
}: DashboardPanelProps) {
	return (
		<section
			className={cn(
				'dashboard-panel relative flex flex-col rounded-2xl border text-[var(--text-primary)]',
				'min-w-0 overflow-hidden',
				fullHeight && 'h-full',
				className,
			)}
			style={{
				borderColor: 'var(--border)',
				backgroundColor: 'var(--panel)',
				borderTop: '2px solid rgba(var(--accent-gold-rgb), 0.3)',
				boxShadow: 'var(--shadow-panel)',
				maxWidth: '100%',
			}}
		>
			{(title || description || actions) && (
				<header
					className={cn(
						'flex flex-col gap-1 px-4 pt-4 text-[var(--text-primary)] sm:flex-row sm:items-center sm:justify-between',
						'min-w-0 overflow-hidden',
						noHeaderBorder ? 'pb-1' : 'border-b pb-3',
					)}
					style={!noHeaderBorder ? { borderColor: 'var(--border)' } : undefined}
				>
					<div className="flex flex-col gap-0.5 min-w-0 overflow-hidden">
						{title && (
							<div className="text-[0.95rem] font-semibold tracking-tight text-[var(--text-primary)] overflow-hidden text-ellipsis">{title}</div>
						)}
						{description && <div className="text-[0.8rem] text-[var(--text-secondary)] overflow-hidden text-ellipsis">{description}</div>}
					</div>
					{actions && <div className="flex flex-shrink-0 items-center gap-2 text-[0.8rem]">{actions}</div>}
				</header>
			)}
			<div
				className={cn('flex-1 min-w-0', noBodyPadding ? '' : 'px-4 pb-4 pt-3', bodyClassName)}
				style={{ color: 'var(--text-primary)' }}
			>
				{children}
			</div>
			{footer && (
				<footer
					className="border-t px-4 py-3 text-[0.75rem]"
					style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
				>
					{footer}
				</footer>
			)}
		</section>
	);
}

interface DashboardGridProps {
	children: ReactNode;
	className?: string;
}

export function DashboardGrid({ children, className }: DashboardGridProps) {
	return <div className={cn('dashboard-grid grid gap-6 items-stretch', className)}>{children}</div>;
}
