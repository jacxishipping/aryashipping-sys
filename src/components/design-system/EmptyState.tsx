"use client";

import { ReactNode } from 'react';

interface EmptyStateProps {
	icon: ReactNode;
	title: string;
	description?: string;
	action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
	return (
		<div className="animate-fade-in-up min-h-[240px] flex flex-col items-center justify-center gap-3 text-center py-8">
			<div className="w-18 h-18 rounded-full bg-[rgba(var(--accent-gold-rgb),0.08)] border border-[rgba(var(--accent-gold-rgb),0.2)] flex items-center justify-center text-[var(--accent-gold)] opacity-80 text-3xl">
				{icon}
			</div>
			<h3 className="text-base font-semibold text-[var(--text-primary)] mt-1">
				{title}
			</h3>
			{description && (
				<p className="text-sm text-[var(--text-secondary)] max-w-md">
					{description}
				</p>
			)}
			{action && <div className="mt-2">{action}</div>}
		</div>
	);
}
