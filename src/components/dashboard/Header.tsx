"use client";

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
	AppBar,
	Toolbar,
	Box,
	Typography,
	IconButton,
	Avatar,
	Menu,
	MenuItem,
	Divider,
	Tooltip,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
	Settings,
	Logout,
	Person,
	Menu as MenuIcon,
  Add as AddIcon,
  Keyboard as KeyboardIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { Ship, Package, FileText } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/design-system';
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
    icon: <Ship style={{ width: 20, height: 20 }} />,
    label: 'New Shipment',
    href: '/dashboard/shipments/new',
    color: 'var(--info)',
		requiredPermission: 'shipments:manage',
  },
  {
    icon: <Package style={{ width: 20, height: 20 }} />,
    label: 'New Container',
    href: '/dashboard/containers/new',
    color: 'var(--success)',
		allowedRoles: ['admin'],
  },
  {
    icon: <FileText style={{ width: 20, height: 20 }} />,
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
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [quickActionEl, setQuickActionEl] = useState<null | HTMLElement>(null);
	const userRole = session?.user?.role;
	const quickActions = useMemo(
		() => quickActionDefinitions.filter(
			(action) =>
				(!action.requiredPermission || hasPermission(userRole, action.requiredPermission)) &&
				(!action.allowedRoles || (userRole ? action.allowedRoles.includes(userRole) : false))
		),
		[userRole]
	);

	const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	};

	const handleMenuClose = () => {
		setAnchorEl(null);
	};
  
  const handleQuickActionOpen = (event: React.MouseEvent<HTMLElement>) => {
		if (quickActions.length === 0) {
			return;
		}

    setQuickActionEl(event.currentTarget);
  };

  const handleQuickActionClose = () => {
    setQuickActionEl(null);
  };

  const handleQuickActionClick = (href: string) => {
    handleQuickActionClose();
    router.push(href);
  };

	const handleSignOut = async () => {
		handleMenuClose();
		await signOut({ redirect: false });
		router.replace('/');
		router.refresh();
	};

  const toggleKeyboardShortcuts = () => {
    window.dispatchEvent(new CustomEvent('toggle-shortcut-help'));
  };

	return (
		<AppBar
			position="sticky"
			elevation={0}
			color="inherit"
			sx={{
				position: 'sticky',
				bgcolor: 'var(--panel)',
				borderBottom: '1px solid var(--border)',
				boxShadow: '0 8px 16px rgba(var(--text-primary-rgb),0.06)',
				'&::after': {
					content: '""',
					position: 'absolute',
					bottom: 0,
					left: 0,
					right: 0,
					height: '1px',
					background: 'linear-gradient(90deg, transparent, rgba(var(--accent-gold-rgb), 0.3), transparent)',
				},
			}}
		>
			<Toolbar
				sx={{
					minHeight: isCompact ? 48 : 56,
					height: isCompact ? 48 : 56,
					px: { xs: 1.5, sm: 2.5 },
					py: 0,
					color: 'var(--text-primary)',
				}}
			>
				{/* Mobile Menu Button */}
				<IconButton
					edge="start"
					color="inherit"
					onClick={onMenuClick}
					aria-label="Open navigation menu"
					sx={{
						mr: 1,
						display: { xs: 'flex', lg: 'none' },
						color: 'var(--text-primary)',
						p: 0.75,
						minWidth: { xs: 44, sm: 0 },
						minHeight: { xs: 44, sm: 0 },
					}}
				>
					<MenuIcon sx={{ fontSize: 22 }} />
				</IconButton>

				{/* Logo/Title */}
				<Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
					<Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', padding: '2px 6px' }}>
						<SiteLogo variant="dashboard" className="w-[72px] sm:w-[88px]" priority />
					</Link>

					{/* Page Title (if provided) */}
					{pageTitle && (
						<>
							<Divider
								orientation="vertical"
								flexItem
								sx={{
									mx: 1.5,
									borderColor: 'var(--border)',
									display: { xs: 'none', md: 'block' },
								}}
							/>
							<Typography
								sx={{
									display: { xs: 'none', md: 'block' },
									fontSize: '0.875rem',
									color: 'var(--text-secondary)',
									fontWeight: 500,
								}}
							>
								{pageTitle}
							</Typography>
						</>
					)}
				</Box>

				{/* Right Actions */}
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
					{/* Global Search (⌘K on desktop, icon button on mobile) */}
					<Box sx={{ display: { xs: 'none', sm: 'flex' }, mr: 0.5 }}>
						<GlobalSearch />
					</Box>
					<Tooltip title="Search">
						<IconButton
							onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
							sx={{
								display: { xs: 'inline-flex', sm: 'none' },
								color: 'var(--text-secondary)',
								p: 0.75,
								minWidth: { xs: 44, sm: 0 },
								minHeight: { xs: 44, sm: 0 },
								'&:hover': {
									color: 'var(--text-primary)',
									bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
								},
							}}
							aria-label="Search"
						>
							<SearchIcon sx={{ fontSize: 22 }} />
						</IconButton>
					</Tooltip>
					{quickActions.length > 0 && (
						<Tooltip title="Quick Actions">
							<IconButton
								onClick={handleQuickActionOpen}
								aria-label="Quick actions"
								aria-haspopup="menu"
								aria-expanded={Boolean(quickActionEl)}
								aria-controls={quickActionEl ? 'quick-actions-menu' : undefined}
								sx={{
									color: 'var(--accent-gold)',
									p: 0.75,
									mr: 0.25,
									minWidth: { xs: 44, sm: 0 },
									minHeight: { xs: 44, sm: 0 },
									'&:hover': {
										bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
										boxShadow: '0 0 0 1px rgba(var(--accent-gold-rgb), 0.2)',
									},
								}}
							>
								<AddIcon sx={{ fontSize: 22 }} />
							</IconButton>
						</Tooltip>
					)}

          {/* Keyboard Shortcuts */}
          <Tooltip title="Keyboard Shortcuts (?)">
            <IconButton
              onClick={toggleKeyboardShortcuts}
              aria-label="Keyboard shortcuts"
              sx={{
                color: 'var(--text-secondary)',
									p: 0.75,
                display: { xs: 'none', md: 'inline-flex' },
                '&:hover': {
                  bgcolor: 'rgba(var(--border-rgb), 0.4)',
                  color: 'var(--text-primary)',
                },
              }}
            >
              <KeyboardIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

					{/* Theme Toggle */}
					<ThemeToggle />
					
					{/* Notifications */}
					<NotificationCenter />

					{/* Settings */}
					<Tooltip title="Settings">
						<Link href="/dashboard/settings" style={{ textDecoration: 'none' }} aria-label="Settings">
							<IconButton
								aria-label="Settings"
								sx={{
									color: 'var(--text-secondary)',
									p: 0.75,
									minWidth: { xs: 44, sm: 0 },
									minHeight: { xs: 44, sm: 0 },
									'&:hover': {
										bgcolor: 'rgba(var(--border-rgb), 0.4)',
										color: 'var(--text-primary)',
									},
								}}
							>
								<Settings sx={{ fontSize: 20 }} />
							</IconButton>
						</Link>
					</Tooltip>

					{/* Profile Menu */}
					<Tooltip title="Account">
						<IconButton
							onClick={handleProfileMenuOpen}
							aria-label="Account"
							aria-haspopup="menu"
							aria-expanded={Boolean(anchorEl)}
							aria-controls={anchorEl ? 'account-menu' : undefined}
							sx={{
								ml: 0.5,
								p: 0.5,
								minWidth: { xs: 44, sm: 0 },
								minHeight: { xs: 44, sm: 0 },
							}}
						>
						<Avatar
							src={session?.user?.image || undefined}
							sx={{
									width: 30,
									height: 30,
								bgcolor: 'var(--accent-gold)',
								fontSize: '0.875rem',
								fontWeight: 600,
								color: 'var(--background)',
							}}
						>
								{session?.user?.name?.charAt(0).toUpperCase() || 'U'}
							</Avatar>
						</IconButton>
					</Tooltip>
				</Box>

				{/* Profile Dropdown Menu */}
				<Menu
					id="account-menu"
					anchorEl={anchorEl}
					open={Boolean(anchorEl)}
					onClose={handleMenuClose}
					PaperProps={{
						sx: {
							mt: 1.5,
							minWidth: 200,
							bgcolor: 'var(--panel)',
							backdropFilter: 'blur(10px)',
							border: '1px solid var(--border)',
							borderRadius: 2,
							boxShadow: '0 8px 32px rgba(var(--text-primary-rgb),0.12)',
						},
					}}
					transformOrigin={{ horizontal: 'right', vertical: 'top' }}
					anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
				>
					{/* User Info */}
					<Box sx={{ px: 2, py: 1.5 }}>
						<Typography
							sx={{
								fontSize: '0.875rem',
								fontWeight: 600,
								color: 'var(--text-primary)',
								mb: 0.25,
							}}
						>
							{session?.user?.name || 'User'}
						</Typography>
						<Typography
							sx={{
								fontSize: '0.75rem',
								color: 'var(--text-secondary)',
							}}
						>
							{session?.user?.email}
						</Typography>
						<Typography
							sx={{
								fontSize: '0.6875rem',
								color: 'var(--accent-gold)',
								mt: 0.5,
								textTransform: 'uppercase',
								fontWeight: 600,
							}}
						>
							{session?.user?.role || 'user'}
						</Typography>
					</Box>

					<Divider sx={{ borderColor: 'var(--border)' }} />

					{/* Menu Items */}
					<Link href="/dashboard/profile" style={{ textDecoration: 'none' }}>
						<MenuItem
							onClick={handleMenuClose}
							sx={{
								color: 'var(--text-primary)',
								fontSize: '0.875rem',
								py: 1.25,
								'&:hover': {
									bgcolor: 'rgba(var(--border-rgb), 0.4)',
								},
							}}
						>
							<Person sx={{ mr: 1.5, fontSize: 20 }} />
							Profile
						</MenuItem>
					</Link>

					<Link href="/dashboard/settings" style={{ textDecoration: 'none' }}>
						<MenuItem
							onClick={handleMenuClose}
							sx={{
								color: 'var(--text-primary)',
								fontSize: '0.875rem',
								py: 1.25,
								'&:hover': {
									bgcolor: 'rgba(var(--border-rgb), 0.4)',
								},
							}}
						>
							<Settings sx={{ mr: 1.5, fontSize: 20 }} />
							Settings
						</MenuItem>
					</Link>

					<Divider sx={{ borderColor: 'var(--border)' }} />

					<MenuItem
						onClick={handleSignOut}
						sx={{
							color: 'var(--error)',
							fontSize: '0.875rem',
							py: 1.25,
							'&:hover': {
								bgcolor: 'rgba(var(--error-rgb), 0.1)',
								color: 'var(--error)',
							},
						}}
					>
						<Logout sx={{ mr: 1.5, fontSize: 20 }} />
						Sign Out
					</MenuItem>
				</Menu>
        
        {/* Quick Actions Menu */}
				{quickActions.length > 0 && (
					<Menu
						id="quick-actions-menu"
						anchorEl={quickActionEl}
						open={Boolean(quickActionEl)}
						onClose={handleQuickActionClose}
						PaperProps={{
							sx: {
								mt: 1.5,
								minWidth: 200,
								bgcolor: 'var(--panel)',
								backdropFilter: 'blur(10px)',
								border: '1px solid var(--border)',
								borderRadius: 2,
								boxShadow: '0 8px 32px rgba(var(--text-primary-rgb),0.12)',
							}
						}}
						transformOrigin={{ horizontal: 'right', vertical: 'top' }}
						anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
					>
						<Box sx={{ px: 2, py: 1.5, pb: 1 }}>
							<Typography variant="subtitle2" color="text.secondary" fontWeight={600} textTransform="uppercase" fontSize="0.7rem">
								Create New
							</Typography>
						</Box>
						{quickActions.map((action) => (
							<MenuItem
								key={action.label}
								onClick={() => handleQuickActionClick(action.href)}
								sx={{
									py: 1.5,
									color: 'var(--text-primary)',
									'&:hover': {
										bgcolor: 'rgba(var(--border-rgb), 0.4)',
									}
								}}
							>
								<ListItemIcon sx={{ color: action.color, minWidth: 36 }}>
									{action.icon}
								</ListItemIcon>
								<ListItemText 
									primary={action.label} 
									primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
								/>
							</MenuItem>
						))}
					</Menu>
				)}
			</Toolbar>
		</AppBar>
	);
}
