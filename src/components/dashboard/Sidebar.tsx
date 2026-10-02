"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import {
  LayoutDashboard,
  Package,
  FileText,
  Search,
  BarChart2,
  Users,
  Boxes,
  Receipt,
  Landmark,
  CreditCard,
  Building2,
  Truck,
  Bot,
  PhoneCall,
  Route,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowLeftRight,
  Repeat,
  Settings,
  Clock,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  LucideIcon,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { Tooltip, Button } from '@/components/design-system';
import { hasPermission, type Permission } from '@/lib/rbac';
import { useTheme } from '@/hooks/useTheme';
import SiteLogo from '@/components/brand/SiteLogo';

type NavigationItem = {
	name: string;
	href: string;
	icon: LucideIcon;
	requiredPermission?: Permission;
	allowedRoles?: string[];
};

type NavBadges = {
	agingShipments: number;
	overdueInvoices: number;
};

type BadgeColor = 'warning' | 'error';

type BadgeMap = Record<string, { count: number; color: BadgeColor }>;

const mainNavigation: NavigationItem[] = [
	{
		name: 'Dashboard',
		href: '/dashboard',
		icon: LayoutDashboard,
	},
];

const shipmentNavigation: NavigationItem[] = [
	{
		name: 'Shipments',
		href: '/dashboard/shipments',
		icon: Package,
		requiredPermission: 'shipments:view',
	},
	{
		name: 'Company Getpasses',
		href: '/dashboard/company-getpasses',
		icon: Clock,
		requiredPermission: 'shipments:manage',
	},
	{
		name: 'Containers',
		href: '/dashboard/containers',
		icon: Boxes,
		requiredPermission: 'containers:view',
	},
	{
		name: 'Dispatches',
		href: '/dashboard/dispatches',
		icon: Truck,
		requiredPermission: 'dispatches:manage',
	},
	{
		name: 'Operations Board',
		href: '/dashboard/operations',
		icon: ArrowLeftRight,
		requiredPermission: 'shipments:manage',
	},
	{
		name: 'Transits',
		href: '/dashboard/transits',
		icon: Route,
		requiredPermission: 'transits:manage',
	},
	{
		name: 'Track Shipments',
		href: '/dashboard/tracking',
		icon: Search,
		requiredPermission: 'tracking:view',
	},
];

const financeNavigation: NavigationItem[] = [
	{
		name: 'Finance',
		href: '/dashboard/finance',
		icon: Landmark,
		requiredPermission: 'finance:view',
	},
	{
		name: 'Office Expenses',
		href: '/dashboard/finance/office-expenses',
		icon: Receipt,
		requiredPermission: 'finance:view',
	},
	{
		name: 'Banking',
		href: '/dashboard/finance/banking',
		icon: CreditCard,
		requiredPermission: 'finance:view',
	},
	{
		name: 'Invoices',
		href: '/dashboard/invoices',
		icon: Receipt,
		requiredPermission: 'invoices:view',
	},
	{
		name: 'Company Ledgers',
		href: '/dashboard/finance/companies',
		icon: Building2,
		requiredPermission: 'finance:manage',
	},
	{
		name: 'Ledger Transfers',
		href: '/dashboard/finance/transfers',
		icon: Repeat,
		requiredPermission: 'finance:manage',
	},
	{
		name: 'Price Comparison',
		href: '/dashboard/finance/price-comparison',
		icon: ArrowLeftRight,
		requiredPermission: 'finance:view',
	},
];

const companyNavigation: NavigationItem[] = [
	{
		name: 'Customers',
		href: '/dashboard/customers',
		icon: Users,
		requiredPermission: 'customers:view',
	},
	{
		name: 'Partner Portals',
		href: '/dashboard/partner-portals',
		icon: Users,
		requiredPermission: 'customers:manage',
	},
];

const aiDocumentNavigation: NavigationItem[] = [
	{
		name: 'Documents',
		href: '/dashboard/documents',
		icon: FileText,
		requiredPermission: 'documents:view',
	},
	{
		name: 'AI Logs',
		href: '/dashboard/ai-logs',
		icon: Bot,
		requiredPermission: 'shipments:read_all',
	},
	{
		name: 'Call Agent',
		href: '/dashboard/settings/call-agent',
		icon: PhoneCall,
		requiredPermission: 'users:manage',
		allowedRoles: ['admin'],
	},
];

const settingsNavigation: NavigationItem[] = [
	{
		name: 'Settings',
		href: '/dashboard/settings',
		icon: Settings,
		requiredPermission: 'users:manage',
	},
];

const adminNavigation: NavigationItem[] = [
	{
		name: 'Analytics',
		href: '/dashboard/analytics',
		icon: BarChart2,
		requiredPermission: 'analytics:view',
	},
	{
		name: 'Users',
		href: '/dashboard/users',
		icon: Users,
		requiredPermission: 'users:manage',
	},
];

interface SidebarProps {
	mobileOpen?: boolean;
	onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
	const pathname = usePathname();
	const { data: session } = useSession();
	type AppUser = Session['user'] & { role?: string };
	const appUser = session?.user as AppUser | undefined;
	const userRole = appUser?.role;
	const visibleAdminItems = filterNavigationItems(adminNavigation, userRole);
	const hasActiveAdminItem = visibleAdminItems.some((item) => isNavigationItemActive(pathname, item.href));
	const [adminCollapsedPreference, setAdminCollapsedPreference] = useState(false);
	const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

	const adminCollapsed = hasActiveAdminItem ? false : adminCollapsedPreference;
	const desktopDrawerWidth = isDesktopCollapsed ? 72 : 260;

	useEffect(() => {
		setAdminCollapsedPreference(window.localStorage.getItem(ADMIN_SECTION_STORAGE_KEY) === 'true');
		try {
			setIsDesktopCollapsed(window.localStorage.getItem('jacxi.sidebar_collapsed') === 'true');
		} catch {
			// ignore storage errors
		}
	}, []);

	const toggleAdminCollapsed = () => {
		setAdminCollapsedPreference((prev) => {
			const next = !prev;
			window.localStorage.setItem(ADMIN_SECTION_STORAGE_KEY, String(next));
			return next;
		});
	};

	const toggleDesktopCollapsed = () => {
		setIsDesktopCollapsed((prev) => {
			const next = !prev;
			try {
				window.localStorage.setItem('jacxi.sidebar_collapsed', String(next));
			} catch {
				// ignore storage errors
			}
			return next;
		});
	};

	return (
		<>
			{/* Mobile Drawer Backdrop and Panel */}
			{mobileOpen && (
				<div className="fixed inset-0 z-50 lg:hidden flex">
					<div
						className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
						onClick={onMobileClose}
					/>
					<div className="relative w-[min(300px,85vw)] h-full bg-[var(--panel)] border-r border-[var(--border)] shadow-2xl z-10 animate-in slide-in-from-left duration-200 flex flex-col">
						<SidebarContent
							pathname={pathname}
							session={session}
							adminCollapsed={adminCollapsed}
							onToggleAdminCollapsed={toggleAdminCollapsed}
							onNavClick={onMobileClose}
							isMobile
						/>
					</div>
				</div>
			)}

			{/* Desktop Sidebar */}
			<aside
				style={{ width: `${desktopDrawerWidth}px` }}
				className="hidden lg:block shrink-0 transition-[width] duration-200 ease-in-out border-r border-[var(--border)] border-t-2 border-t-[rgba(var(--accent-gold-rgb),0.15)] bg-[var(--panel)] relative h-full overflow-hidden"
			>
				<SidebarContent
					pathname={pathname}
					session={session}
					adminCollapsed={adminCollapsed}
					onToggleAdminCollapsed={toggleAdminCollapsed}
					collapsed={isDesktopCollapsed}
					onToggleCollapse={toggleDesktopCollapsed}
				/>
			</aside>
		</>
	);
}

type NavItemProps = {
	item: NavigationItem;
	isActive: (href: string) => boolean;
	badge?: number;
	badgeColor?: BadgeColor;
	onNavClick?: () => void;
	collapsed?: boolean;
};

function NavItem({ item, isActive, badge, badgeColor, onNavClick, collapsed }: NavItemProps) {
	const { density } = useTheme();
	const isCompact = density === 'compact';
	const Icon = item.icon;
	const active = isActive(item.href);
	const router = useRouter();

	const handlePrefetch = () => {
		router.prefetch(item.href);
	};

	const badgeStyles: Record<BadgeColor, { background: string; color: string; border: string }> = {
		warning: {
			background: 'rgba(var(--warning-rgb), 0.15)',
			color: 'var(--warning)',
			border: '1px solid rgba(var(--warning-rgb), 0.3)',
		},
		error: {
			background: 'rgba(var(--error-rgb), 0.15)',
			color: 'var(--error)',
			border: '1px solid rgba(var(--error-rgb), 0.3)',
		},
	};
	const badgeStyle = badgeColor ? badgeStyles[badgeColor] : null;
	const badgeLabel = typeof badge === 'number' && badge > 99 ? '99+' : badge;

	const itemButton = (
		<Link
			href={item.href}
			onClick={onNavClick}
			onMouseEnter={handlePrefetch}
			onFocus={handlePrefetch}
			aria-current={active ? 'page' : undefined}
			className={`relative flex items-center gap-3 no-underline transition-colors ${
				isCompact ? 'rounded-lg my-0.5 py-1 px-3' : 'rounded-xl my-1 py-2 px-3.5'
			} ${collapsed ? 'justify-center mx-1 px-2' : 'mx-2'} ${
				active
					? 'bg-[rgba(var(--accent-gold-rgb),0.15)] text-[var(--accent-gold)] font-semibold shadow-[inset_0_0_0_1px_rgba(var(--accent-gold-rgb),0.2)]'
					: 'text-[var(--text-primary)] hover:bg-[rgba(var(--accent-gold-rgb),0.06)] hover:text-[var(--text-primary)]'
			}`}
		>
			{active && (
				<span className="absolute left-0 top-1 bottom-1 w-1 bg-[var(--accent-gold)] rounded-r shadow-[2px_0_8px_rgba(var(--accent-gold-rgb),0.4)]" />
			)}
			<div className={`shrink-0 flex items-center justify-center ${active ? 'text-[var(--accent-gold)]' : 'text-[var(--text-primary)]'}`}>
				<Icon className="w-4 h-4" />
				{collapsed && typeof badge === 'number' && badge > 0 && (
					<span
						className={`absolute top-1.5 right-3 w-2 h-2 rounded-full ${
							badgeColor === 'error' ? 'bg-[var(--error)]' : 'bg-[var(--warning)]'
						}`}
					/>
				)}
			</div>
			{!collapsed && (
				<span className={`truncate flex-1 ${isCompact ? 'text-xs' : 'text-sm'} font-medium`}>
					{item.name}
				</span>
			)}
			{!collapsed && typeof badge === 'number' && badge > 0 && badgeStyle && (
				<span
					style={{
						background: badgeStyle.background,
						color: badgeStyle.color,
						border: badgeStyle.border,
					}}
					className="rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none min-w-[18px] text-center ml-auto shrink-0 flex items-center justify-center"
				>
					{badgeLabel}
				</span>
			)}
		</Link>
	);

	if (collapsed) {
		return (
			<Tooltip title={item.name} placement="right">
				{itemButton}
			</Tooltip>
		);
	}

	return itemButton;
}

type NavSectionProps = {
	title?: string;
	items: NavigationItem[];
	role?: string;
	isActive: (href: string) => boolean;
	badgeMap?: BadgeMap;
	onNavClick?: () => void;
	collapsed?: boolean;
};

const ADMIN_SECTION_STORAGE_KEY = 'sidebar_admin_collapsed';

const sectionIcons: Partial<Record<string, LucideIcon>> = {
	Operations: Package,
	Finance: Landmark,
	'Companies & Customers': Building2,
	'AI & Documents': Bot,
	Settings: Settings,
	Admin: ShieldAlert,
};

function isNavigationItemActive(pathname: string, href: string) {
	if (href === '/dashboard') {
		return pathname === '/dashboard';
	}

	if (href === '/dashboard/finance' || href === '/dashboard/settings') {
		return pathname === href;
	}

	return pathname.startsWith(href);
}

function filterNavigationItems(items: NavigationItem[], role?: string) {
	return items.filter(
		(item) =>
			(!item.requiredPermission || hasPermission(role, item.requiredPermission)) &&
			(!item.allowedRoles || (role ? item.allowedRoles.includes(role) : false))
	);
}

function NavSection({ title, items, role, isActive, badgeMap, onNavClick, collapsed }: NavSectionProps) {
	const SectionIcon = title ? sectionIcons[title] : undefined;

	return (
		<div className="mb-1">
			{title && !collapsed && (
				<div className="px-4 py-1 mt-2">
					<span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider inline-flex items-center gap-1.5">
						{SectionIcon && <SectionIcon className="w-3 h-3" />}
						{title}
					</span>
				</div>
			)}
			{title && collapsed && (
				<div className="my-2 mx-3 h-[1px] bg-[var(--border)]" />
			)}
			<div className="flex flex-col">
				{filterNavigationItems(items, role).map((item) => (
					<NavItem
						key={item.name}
						item={item}
						isActive={isActive}
						badge={badgeMap?.[item.href]?.count}
						badgeColor={badgeMap?.[item.href]?.color}
						onNavClick={onNavClick}
						collapsed={collapsed}
					/>
				))}
			</div>
		</div>
	);
}

function CollapsibleAdminSection({
	items,
	role,
	isActive,
	badgeMap,
	onNavClick,
	collapsed,
	onToggleCollapsed,
	isSidebarCollapsed,
}: NavSectionProps & {
	collapsed: boolean;
	onToggleCollapsed: () => void;
	isSidebarCollapsed?: boolean;
}) {
	const visibleItems = filterNavigationItems(items, role);
	const SectionIcon = sectionIcons.Admin;

	if (isSidebarCollapsed) {
		return (
			<div className="mb-1">
				<div className="my-2 mx-3 h-[1px] bg-[var(--border)]" />
				<div className="flex flex-col">
					{visibleItems.map((item) => (
						<NavItem
							key={item.name}
							item={item}
							isActive={isActive}
							badge={badgeMap?.[item.href]?.count}
							badgeColor={badgeMap?.[item.href]?.color}
							onNavClick={onNavClick}
							collapsed={true}
						/>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="mb-1">
			<div
				className="px-4 py-1 mt-2 flex items-center justify-between cursor-pointer select-none"
				onClick={onToggleCollapsed}
			>
				<span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider inline-flex items-center gap-1.5">
					{SectionIcon && <SectionIcon className="w-3 h-3" />}
					Admin
				</span>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onToggleCollapsed();
					}}
					aria-label={collapsed ? 'Expand admin navigation' : 'Collapse admin navigation'}
					className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent border-0 cursor-pointer"
				>
					{collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
				</button>
			</div>
			{!collapsed && (
				<div className="flex flex-col animate-in fade-in duration-150">
					{visibleItems.map((item) => (
						<NavItem
							key={item.name}
							item={item}
							isActive={isActive}
							badge={badgeMap?.[item.href]?.count}
							badgeColor={badgeMap?.[item.href]?.color}
							onNavClick={onNavClick}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function SidebarContent({
	pathname,
	session,
	adminCollapsed,
	onToggleAdminCollapsed,
	onNavClick,
	collapsed = false,
	onToggleCollapse,
	isMobile = false,
}: {
	pathname: string;
	session: Session | null;
	adminCollapsed: boolean;
	onToggleAdminCollapsed: () => void;
	onNavClick?: () => void;
	collapsed?: boolean;
	onToggleCollapse?: () => void;
	isMobile?: boolean;
}) {
	type AppUser = Session['user'] & { role?: string };
	const appUser = session?.user as AppUser | undefined;
	const userRole = appUser?.role;
	const userName = appUser?.name || 'User';
	const userInitial = userName.charAt(0).toUpperCase();
	const userImage = appUser?.image || undefined;
	const [navBadges, setNavBadges] = useState<NavBadges | null>(null);

	useEffect(() => {
		let isMounted = true;

		const loadNavBadges = async () => {
			try {
				const response = await fetch('/api/nav-badges');

				if (!response.ok) {
					return;
				}

				const data = (await response.json()) as NavBadges;

				if (isMounted) {
					setNavBadges(data);
				}
			} catch {
				// Gracefully omit badges if this request fails.
			}
		};

		void loadNavBadges();

		return () => {
			isMounted = false;
		};
	}, []);

	const badgeMap: BadgeMap | undefined = navBadges
		? {
				'/dashboard/shipments': { count: navBadges.agingShipments, color: 'warning' },
				'/dashboard/invoices': { count: navBadges.overdueInvoices, color: 'error' },
		  }
		: undefined;

	const isActive = (href: string) => {
		return isNavigationItemActive(pathname, href);
	};

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Mobile Drawer Header */}
			{isMobile && (
				<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--panel)]">
					<SiteLogo variant="dashboard" className="w-[84px]" priority />
					<button
						type="button"
						onClick={onNavClick}
						aria-label="Close menu"
						className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			)}

			{/* Navigation - scrollable */}
			<div className="flex-1 px-1 py-3 overflow-y-auto flex flex-col no-scrollbar">
				{/* Main */}
				<NavSection items={mainNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} collapsed={collapsed} />

				{/* Operations */}
				<NavSection title="Operations" items={shipmentNavigation} role={userRole} isActive={isActive} badgeMap={badgeMap} onNavClick={onNavClick} collapsed={collapsed} />

				{/* Finance */}
				<NavSection title="Finance" items={financeNavigation} role={userRole} isActive={isActive} badgeMap={badgeMap} onNavClick={onNavClick} collapsed={collapsed} />

				{/* Companies & Customers */}
				<NavSection title="Companies & Customers" items={companyNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} collapsed={collapsed} />

				{/* AI & Documents */}
				<NavSection title="AI & Documents" items={aiDocumentNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} collapsed={collapsed} />

				{/* Settings */}
				<NavSection title="Settings" items={settingsNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} collapsed={collapsed} />

				{/* Admin / Internal Section */}
				<CollapsibleAdminSection items={adminNavigation} role={userRole} isActive={isActive} badgeMap={badgeMap} onNavClick={onNavClick} collapsed={adminCollapsed} onToggleCollapsed={onToggleAdminCollapsed} isSidebarCollapsed={collapsed} />
			</div>

			{collapsed ? (
				<div className="border-t border-[var(--border)] p-2 flex flex-col items-center gap-2 bg-[var(--panel)]">
					<Tooltip title={`${userName} (${userRole || 'user'})`} placement="right">
						{userImage ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={userImage} alt={userName} className="w-8 h-8 rounded-full object-cover shrink-0" />
						) : (
							<div className="w-8 h-8 rounded-full bg-[var(--accent-gold)] text-[var(--background)] font-bold text-xs flex items-center justify-center shrink-0">
								{userInitial}
							</div>
						)}
					</Tooltip>
					{onToggleCollapse && (
						<Tooltip title="Expand sidebar" placement="right">
							<button
								type="button"
								onClick={onToggleCollapse}
								aria-label="Expand sidebar"
								className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] hover:bg-[rgba(var(--accent-gold-rgb),0.1)] rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</Tooltip>
					)}
					<Tooltip title="Sign Out" placement="right">
						<button
							type="button"
							onClick={() => signOut({ callbackUrl: '/auth/signin' })}
							aria-label="Sign out"
							className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-red-500/10 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
						>
							<LogOut className="w-4 h-4" />
						</button>
					</Tooltip>
				</div>
			) : (
				<div className={`border-t border-[var(--border)] px-4 py-3 bg-[var(--panel)] ${isMobile ? 'pb-[calc(16px+env(safe-area-inset-bottom,0px))]' : ''}`}>
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-3 min-w-0 flex-1">
							{userImage ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img src={userImage} alt={userName} className="w-8 h-8 rounded-full object-cover shrink-0" />
							) : (
								<div className="w-8 h-8 rounded-full bg-[var(--accent-gold)] text-[var(--background)] font-bold text-xs flex items-center justify-center shrink-0">
									{userInitial}
								</div>
							)}
							<div className="min-w-0">
								<div className="text-sm font-semibold text-[var(--text-primary)] truncate">
									{userName}
								</div>
								<div className="text-xs text-[var(--text-secondary)] capitalize truncate">
									{userRole || 'user'}
								</div>
							</div>
						</div>
						{onToggleCollapse && (
							<Tooltip title="Collapse sidebar" placement="right">
								<button
									type="button"
									onClick={onToggleCollapse}
									aria-label="Collapse sidebar"
									className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--accent-gold-rgb),0.1)] rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
								>
									<ChevronLeft className="w-4 h-4" />
								</button>
							</Tooltip>
						)}
					</div>
					<Button
						fullWidth
						size="sm"
						variant="outline"
						onClick={() => signOut({ callbackUrl: '/auth/signin' })}
					>
						Sign Out
					</Button>
				</div>
			)}
		</div>
	);
}
