"use client";

import Link from 'next/link';
import { Plus, Search, Package, FileText, LucideIcon } from 'lucide-react';

const actions = [
	{
		icon: Plus,
		title: 'New Shipment',
		description: 'Create a new shipping request',
		href: '/dashboard/shipments/new',
		color: 'cyan',
		colorValues: {
			border: 'rgba(var(--accent-gold-rgb), 0.4)',
			borderHover: 'rgba(var(--accent-gold-rgb), 0.8)',
			text: 'var(--accent-gold)',
			bgHover: 'rgba(var(--accent-gold-rgb), 0.15)',
			glow: 'rgba(var(--accent-gold-rgb), 0.3)',
		},
	},
	{
		icon: Search,
		title: 'Track Shipment',
		description: 'Track an existing shipment',
		href: '/dashboard/tracking',
		color: 'blue',
		colorValues: {
			border: 'rgba(var(--accent-gold-rgb), 0.4)',
			borderHover: 'rgba(var(--accent-gold-rgb), 0.8)',
			text: 'var(--accent-gold)',
			bgHover: 'rgba(var(--accent-gold-rgb), 0.15)',
			glow: 'rgba(var(--accent-gold-rgb), 0.3)',
		},
	},
	{
		icon: Package,
		title: 'All Shipments',
		description: 'View all your shipments',
		href: '/dashboard/shipments',
		color: 'purple',
		colorValues: {
			border: 'rgba(var(--accent-gold-rgb), 0.4)',
			borderHover: 'rgba(var(--accent-gold-rgb), 0.8)',
			text: 'var(--accent-gold)',
			bgHover: 'rgba(var(--accent-gold-rgb), 0.15)',
			glow: 'rgba(var(--accent-gold-rgb), 0.3)',
		},
	},
	{
		icon: FileText,
		title: 'Documents',
		description: 'Manage shipping documents',
		href: '/dashboard/documents',
		color: 'green',
		colorValues: {
			border: 'rgba(var(--accent-gold-rgb), 0.4)',
			borderHover: 'rgba(var(--accent-gold-rgb), 0.8)',
			text: 'var(--accent-gold)',
			bgHover: 'rgba(var(--accent-gold-rgb), 0.15)',
			glow: 'rgba(var(--accent-gold-rgb), 0.3)',
		},
	},
];

type QuickActionsProps = {
	showHeading?: boolean;
};

export default function QuickActions({ showHeading = false }: QuickActionsProps = {}) {
	return (
		<div className="animate-in fade-in duration-300">
			{showHeading && (
				<div className="mb-2">
					<span className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] block">
						Action Center
					</span>
					<span className="text-sm font-semibold text-[var(--text-primary)]">
						Start a workflow
					</span>
				</div>
			)}
			<div className="grid grid-cols-2 md:grid-cols-2 gap-2">
				{actions.map((action) => (
					<ActionCard key={action.title} {...action} />
				))}
			</div>
		</div>
	);
}

interface ActionCardProps {
	icon: LucideIcon;
	title: string;
	description: string;
	href: string;
	color: string;
	colorValues: {
		border: string;
		borderHover: string;
		text: string;
		bgHover: string;
		glow: string;
	};
}

function ActionCard({ icon: Icon, title, description, href, colorValues }: ActionCardProps) {
	return (
		<Link href={href} className="no-underline">
			<div
				style={{
					borderColor: colorValues.border,
				}}
				className="rounded-xl border bg-[var(--panel)] shadow-sm p-2.5 flex flex-col gap-1 min-h-[92px] transition-all hover:-translate-y-0.5 hover:shadow-md"
			>
				<div className="flex items-center gap-2">
					<div
						style={{
							borderColor: colorValues.border,
							color: colorValues.text,
						}}
						className="w-7 h-7 rounded-lg border bg-[rgba(var(--text-secondary-rgb),0.15)] flex items-center justify-center shrink-0"
					>
						<Icon className="w-4 h-4" />
					</div>
					<span className="text-xs font-semibold text-[var(--text-primary)] truncate">
						{title}
					</span>
				</div>
				<p className="text-[0.68rem] text-[var(--text-secondary)] leading-tight flex-1 m-0">
					{description}
				</p>
			</div>
		</Link>
	);
}
