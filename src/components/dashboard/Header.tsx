"use client";

import { useMemo, useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Menu as MenuIcon,
  Plus,
  Keyboard as KeyboardIcon,
  Search as SearchIcon,
  Settings,
  LogOut,
  User as PersonIcon,
  Ship,
  Package,
  FileText,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { ThemeToggle, Tooltip } from '@/components/design-system';
import SiteLogo from '@/components/brand/SiteLogo';
import { NotificationCenter } from '@/components/ui/NotificationCenter';
import GlobalSearch from '@/components/dashboard/GlobalSearch';
import { hasPermission, type Permission } from '@/lib/rbac';
import { useTheme } from '@/hooks/useTheme';

interface HeaderProps {
	onMenuClick?: () => void;
	pageTitle?: string;
}

type QuickAction = {
	icon: React.ReactNode;
	label: string;
	href: string;
	color: string;
	requiredPermission?: Permission;
	allowedRoles?: string[];
};

const quickActionDefinitions = [
  {
    icon: <Ship className="w-5 h-5" />,
    label: 'New Shipment',
    href: '/dashboard/shipments/new',
    color: 'var(--info)',
		requiredPermission: 'shipments:manage',
  },
  {
    icon: <Package className="w-5 h-5" />,
    label: 'New Container',
    href: '/dashboard/containers/new',
    color: 'var(--success)',
		allowedRoles: ['admin'],
  },
  {
    icon: <FileText className="w-5 h-5" />,
    label: 'New Invoice',
    href: '/dashboard/invoices/new',
    color: 'var(--warning)',
		requiredPermission: 'invoices:manage',
  },
] satisfies QuickAction[];

export default function Header({ onMenuClick, pageTitle }: HeaderProps) {
	const { density } = useTheme();
	const isCompact = density === 'compact';
	const { data: session } = useSession();
  const router = useRouter();
	const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const quickActionRef = useRef<HTMLDivElement>(null);

	const userRole = session?.user?.role;
	const quickActions = useMemo(
		() => quickActionDefinitions.filter(
			(action) =>
				(!action.requiredPermission || hasPermission(userRole, action.requiredPermission)) &&
				(!action.allowedRoles || (userRole ? action.allowedRoles.includes(userRole) : false))
		),
		[userRole]
	);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (quickActionRef.current && !quickActionRef.current.contains(e.target as Node)) {
        setIsQuickActionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

	const handleSignOut = async () => {
		setIsProfileMenuOpen(false);
		await signOut({ redirect: false });
		router.replace('/');
		router.refresh();
	};

  const toggleKeyboardShortcuts = () => {
    window.dispatchEvent(new CustomEvent('toggle-shortcut-help'));
  };

	return (
		<header className="sticky top-0 z-30 bg-[var(--panel)] border-b border-[var(--border)] shadow-sm">
			<div
				className={`flex items-center px-4 sm:px-6 ${
					isCompact ? 'h-12' : 'h-14'
				} text-[var(--text-primary)]`}
			>
				{/* Mobile Menu Button */}
				<button
					type="button"
					onClick={onMenuClick}
					aria-label="Open navigation menu"
					className="mr-2 flex lg:hidden p-2 text-[var(--text-primary)] hover:bg-[var(--background)] rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
				>
					<MenuIcon className="w-5 h-5" />
				</button>

				{/* Logo/Title */}
				<div className="flex items-center flex-grow min-w-0">
					<Link href="/dashboard" className="flex items-center py-0.5 px-1.5 no-underline">
						<SiteLogo variant="dashboard" className="w-[72px] sm:w-[88px]" priority />
					</Link>

					{/* Page Title */}
					{pageTitle && (
						<>
							<div className="hidden md:block w-[1px] h-5 bg-[var(--border)] mx-3" />
							<span className="hidden md:block text-sm text-[var(--text-secondary)] font-medium truncate">
								{pageTitle}
							</span>
						</>
					)}
				</div>

				{/* Right Actions */}
				<div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
					{/* Global Search */}
					<div className="hidden sm:flex mr-1">
						<GlobalSearch />
					</div>
					<Tooltip title="Search">
						<button
							type="button"
							onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
							aria-label="Search"
							className="inline-flex sm:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--accent-gold-rgb),0.1)] rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
						>
							<SearchIcon className="w-5 h-5" />
						</button>
					</Tooltip>

					{/* Quick Actions */}
					{quickActions.length > 0 && (
						<div className="relative" ref={quickActionRef}>
							<Tooltip title="Quick Actions">
								<button
									type="button"
									onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
									aria-label="Quick actions"
									aria-haspopup="menu"
									aria-expanded={isQuickActionOpen}
									className="p-2 text-[var(--accent-gold)] hover:bg-[rgba(var(--accent-gold-rgb),0.1)] rounded-lg transition-colors border-0 bg-transparent cursor-pointer flex items-center justify-center"
								>
									<Plus className="w-5 h-5" />
								</button>
							</Tooltip>

							{isQuickActionOpen && (
								<div className="absolute right-0 top-full mt-2 w-52 bg-[var(--panel)] backdrop-blur-md border border-[var(--border)] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
									<div className="px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
										Create New
									</div>
									{quickActions.map((action) => (
										<button
											key={action.label}
											type="button"
											onClick={() => {
												setIsQuickActionOpen(false);
												router.push(action.href);
											}}
											className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors border-0 bg-transparent text-left cursor-pointer"
										>
											<div style={{ color: action.color }} className="shrink-0">
												{action.icon}
											</div>
											<span>{action.label}</span>
										</button>
									))}
								</div>
							)}
						</div>
					)}

          {/* Keyboard Shortcuts */}
          <Tooltip title="Keyboard Shortcuts (?)">
            <button
              type="button"
              onClick={toggleKeyboardShortcuts}
              aria-label="Keyboard shortcuts"
              className="hidden md:inline-flex p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--border-rgb),0.4)] rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
            >
              <KeyboardIcon className="w-5 h-5" />
            </button>
          </Tooltip>

					{/* Theme Toggle */}
					<ThemeToggle />
					
					{/* Notifications */}
					<NotificationCenter />

					{/* Settings */}
					<Tooltip title="Settings">
						<Link
							href="/dashboard/settings"
							aria-label="Settings"
							className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--border-rgb),0.4)] rounded-lg transition-colors no-underline flex items-center justify-center"
						>
							<Settings className="w-5 h-5" />
						</Link>
					</Tooltip>

					{/* Profile Menu */}
					<div className="relative ml-1" ref={profileMenuRef}>
						<Tooltip title="Account">
							<button
								type="button"
								onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
								aria-label="Account"
								aria-haspopup="menu"
								aria-expanded={isProfileMenuOpen}
								className="p-0.5 rounded-full border-0 bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
							>
								{session?.user?.image ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										src={session.user.image}
										alt={session.user.name || 'User'}
										className="w-8 h-8 rounded-full object-cover"
									/>
								) : (
									<div className="w-8 h-8 rounded-full bg-[var(--accent-gold)] text-[var(--background)] font-bold text-sm flex items-center justify-center">
										{session?.user?.name?.charAt(0).toUpperCase() || 'U'}
									</div>
								)}
							</button>
						</Tooltip>

						{isProfileMenuOpen && (
							<div className="absolute right-0 top-full mt-2 w-56 bg-[var(--panel)] backdrop-blur-md border border-[var(--border)] rounded-xl shadow-2xl py-1.5 z-50 divide-y divide-[var(--border)] animate-in fade-in zoom-in-95 duration-150">
								{/* User Info */}
								<div className="px-4 py-2.5">
									<div className="text-sm font-semibold text-[var(--text-primary)] truncate">
										{session?.user?.name || 'User'}
									</div>
									<div className="text-xs text-[var(--text-secondary)] truncate">
										{session?.user?.email}
									</div>
									<span className="inline-block mt-1 text-[0.6875rem] text-[var(--accent-gold)] font-bold uppercase tracking-wider">
										{session?.user?.role || 'user'}
									</span>
								</div>

								{/* Menu Items */}
								<div className="py-1">
									<Link
										href="/dashboard/profile"
										onClick={() => setIsProfileMenuOpen(false)}
										className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors no-underline"
									>
										<PersonIcon className="w-4 h-4 text-[var(--text-secondary)]" />
										<span>Profile</span>
									</Link>

									<Link
										href="/dashboard/settings"
										onClick={() => setIsProfileMenuOpen(false)}
										className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors no-underline"
									>
										<Settings className="w-4 h-4 text-[var(--text-secondary)]" />
										<span>Settings</span>
									</Link>
								</div>

								<div className="py-1">
									<button
										type="button"
										onClick={handleSignOut}
										className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--error)] hover:bg-red-500/10 transition-colors border-0 bg-transparent text-left cursor-pointer"
									>
										<LogOut className="w-4 h-4" />
										<span>Sign Out</span>
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
