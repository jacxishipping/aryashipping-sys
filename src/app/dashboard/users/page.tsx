'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { User, UserPlus, Eye, EyeOff, Copy, Check, Pencil, Trash2, Shield, Users as UsersIcon } from 'lucide-react';
function sxToStyle(sx?: any): React.CSSProperties {
  if (!sx) return {};
  const style: any = {};
  for (const [key, val] of Object.entries(sx)) {
    if (key.startsWith('&') || key.startsWith('@')) continue;
    if (typeof val === 'object' && val !== null) {
      const resolved = (val as any).xs ?? (val as any).md ?? (val as any).lg;
      if (resolved !== undefined) style[key] = resolved;
      continue;
    }
    if (key === 'bgcolor') style.backgroundColor = val;
    else if (key === 'p') style.padding = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'px') { style.paddingLeft = typeof val === 'number' ? `${val * 8}px` : val; style.paddingRight = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'py') { style.paddingTop = typeof val === 'number' ? `${val * 8}px` : val; style.paddingBottom = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'pt') style.paddingTop = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pb') style.paddingBottom = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pl') style.paddingLeft = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pr') style.paddingRight = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'm') style.margin = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mx') { style.marginLeft = typeof val === 'number' ? `${val * 8}px` : val; style.marginRight = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'my') { style.marginTop = typeof val === 'number' ? `${val * 8}px` : val; style.marginBottom = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'mt') style.marginTop = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mb') style.marginBottom = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'ml') style.marginLeft = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mr') style.marginRight = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'gap') style.gap = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'borderRadius') style.borderRadius = typeof val === 'number' ? `${val * 8}px` : val;
    else style[key] = val;
  }
  return style;
}

function Box({ children, className = '', component: Component = 'div', sx, style, ...props }: React.HTMLAttributes<HTMLElement> & { component?: any; sx?: any; [key: string]: any }) {
  return (
    <Component className={className} style={{ ...sxToStyle(sx), ...style }} {...props}>
      {children}
    </Component>
  );
}

function Typography({ children, className = '', component: Component = 'div', variant, color, noWrap, sx, style, ...props }: React.HTMLAttributes<HTMLElement> & { component?: any; variant?: string; color?: string; noWrap?: boolean; sx?: any; [key: string]: any }) {
  const variantClass = variant === 'caption' ? 'text-xs text-[var(--text-secondary)]' : variant === 'subtitle2' ? 'text-sm font-semibold' : variant === 'body2' ? 'text-sm' : '';
  return (
    <Component className={`${variantClass} ${noWrap ? 'truncate' : ''} ${className}`} style={{ ...sxToStyle(sx), ...style }} {...props}>
      {children}
    </Component>
  );
}

function IconButton({ children, onClick, size, className = '', sx, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { sx?: any; size?: any; color?: any }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded-lg hover:bg-[var(--panel-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center justify-center ${className}`}
      style={sxToStyle(sx)}
      {...props}
    >
      {children}
    </button>
  );
}
import { PageHeader, StatsCard, toast, SkeletonCard, StatusBadge, Button, CompactSkeleton } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import SmartSearch, { SearchFilters } from '@/components/dashboard/SmartSearch';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import UserCard from '@/components/dashboard/UserCard';
import { hasPermission } from '@/lib/rbac';
import { useConfirmAction } from '@/components/ui/ConfirmActionProvider';

interface UserData {
	id: string;
	name: string | null;
	email: string;
	role: string;
	createdAt?: string;
	_count?: {
		shipments: number;
	};
}

export default function UsersPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const confirmAction = useConfirmAction();
	const [users, setUsers] = useState<UserData[]>([]);
	const [loading, setLoading] = useState(true);
	const [totalUsers, setTotalUsers] = useState<number>(0);
	const [adminsCount, setAdminsCount] = useState<number>(0);
	const [regularUsersCount, setRegularUsersCount] = useState<number>(0);
	const [currentPage, setCurrentPage] = useState<number>(1);

	const [searchFilters, setSearchFilters] = useState<SearchFilters>({
		query: '',
		type: 'users',
	});
	const [showEmailsFor, setShowEmailsFor] = useState<Set<string>>(new Set());
	const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
	const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null);

	useEffect(() => {
		if (status === 'loading') return;

		const role = session?.user?.role;
		if (!session || !hasPermission(role, 'users:manage')) {
			router.replace('/dashboard');
			return;
		}
	}, [session, status, router]);

	const PAGE_SIZE = 9;

	const fetchUsers = useCallback(async (page: number = 1, query: string = searchFilters.query) => {
		try {
			setLoading(true);
			const url = `/api/users?page=${page}&pageSize=${PAGE_SIZE}&roleType=users${query ? `&query=${encodeURIComponent(query)}` : ''}`;
			const response = await fetch(url);
			if (response.ok) {
				const data = await response.json();

				let serverUsers = data.users || [];
				let createdJson: string | null = null;
				let createdUser: UserData | null = null;
				try {
					createdJson = sessionStorage.getItem('jacxi.createdUser');
					if (createdJson) {
						createdUser = JSON.parse(createdJson) as UserData;
						if (createdUser && !serverUsers.some((u: UserData) => u.id === createdUser!.id)) {
							serverUsers = [createdUser, ...serverUsers];
							if (createdUser.role === 'admin') {
								data.admins = (data.admins ?? 0) + 1;
							} else {
								data.regularUsers = (data.regularUsers ?? 0) + 1;
							}
							data.total = (data.total ?? 0) + 1;
							sessionStorage.removeItem('jacxi.createdUser');
						}
					}
				} catch {
					// ignore parse/storage errors
				}

				setUsers(serverUsers);
				setTotalUsers(data.total ?? 0);
				setAdminsCount(data.admins ?? 0);
				setRegularUsersCount(data.regularUsers ?? 0);
				setCurrentPage(data.page ?? page);
			} else {
				console.error('Failed to fetch users (response not ok)', response.status);
				toast.error('Failed to fetch users');
			}
		} catch (error) {
			console.error('Error fetching users:', error);
			toast.error('Error fetching users');
		} finally {
			setLoading(false);
		}
	}, [searchFilters.query]);

	useEffect(() => {
		if (typeof BroadcastChannel === 'undefined') return;
		const bc = new BroadcastChannel('jacxi-users');
		const handler = (ev: MessageEvent) => {
			try {
				const msg = ev.data as { action: string; user?: UserData };
				if (msg?.action === 'created' && msg.user) {
					setUsers((prev) => {
						if (prev.some((u) => u.id === msg.user!.id)) return prev;
						return [msg.user!, ...prev];
					});
					setTotalUsers((t) => t + 1);
					if (msg.user.role === 'admin') setAdminsCount((a) => a + 1);
					else setRegularUsersCount((r) => r + 1);
					setHighlightedUserId(msg.user.id);
					setTimeout(() => setHighlightedUserId(null), 4000);
				}
			} catch {
				// ignore
			}
		};
		bc.addEventListener('message', handler as EventListener);
		return () => {
			bc.removeEventListener('message', handler as EventListener);
			bc.close();
		};
	}, []);

	useEffect(() => {
		if (status === 'loading') return;
		const role = session?.user?.role;
		if (!session || !hasPermission(role, 'users:manage')) return;
		fetchUsers(currentPage);
	}, [session, status, router, currentPage, fetchUsers]);

	const handleSearch = (filters: SearchFilters) => {
		setSearchFilters(filters);
		setCurrentPage(1);
		fetchUsers(1, filters.query);
	};

	const formatRole = (role: string) => {
		return role.charAt(0).toUpperCase() + role.slice(1);
	};

	const toggleEmailVisibility = (userId: string) => {
		setShowEmailsFor((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(userId)) {
				newSet.delete(userId);
			} else {
				newSet.add(userId);
			}
			return newSet;
		});
	};

	const copyToClipboard = async (text: string, userId: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedEmail(userId);
			toast.success('Email copied to clipboard');
			setTimeout(() => setCopiedEmail(null), 2000);
		} catch {
			toast.error('Failed to copy email');
		}
	};

	const maskEmail = (email: string) => {
		const [name, domain] = email.split('@');
		if (!domain) return email;
		const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
		return `${maskedName}@${domain}`;
	};

	const handleDeleteUser = async (user: UserData) => {
		const confirmed = await confirmAction({
			title: 'Delete User Account',
			message: `Delete internal user "${user.name || user.email}"? This action cannot be undone.`,
			confirmText: 'Delete User',
			severity: 'error',
		});
		if (!confirmed) return;

		try {
			setLoading(true);
			const resp = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
			if (resp.ok) {
				toast.success('User deleted successfully');
				const nextPage = currentPage > 1 && users.length === 1 ? currentPage - 1 : currentPage;
				setCurrentPage(nextPage);
				await fetchUsers(nextPage, searchFilters.query);
			} else {
				toast.error('Failed to delete user');
			}
		} catch (err) {
			console.error('Error deleting user:', err);
			toast.error('Error deleting user');
		} finally {
			setLoading(false);
		}
	};

	const userColumns = useMemo<Column<UserData>[]>(() => [
		{
			key: 'name',
			header: 'Name',
			sortable: true,
			render: (_, row) => (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
					<Box
						sx={{
							width: 32,
							height: 32,
							borderRadius: '50%',
							bgcolor: 'rgba(var(--accent-gold-rgb), 0.15)',
							color: 'var(--accent-gold)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontWeight: 600,
							fontSize: '0.8rem',
						}}
					>
						{(row.name || row.email || 'U')[0].toUpperCase()}
					</Box>
					<Box>
						<Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
							{row.name || 'Unnamed User'}
						</Typography>
						<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
							{formatRole(row.role)}
						</Typography>
					</Box>
				</Box>
			),
		},
		{
			key: 'role',
			header: 'Role',
			sortable: true,
			render: (_, row) => (
				<StatusBadge
					status={row.role === 'admin' ? 'SUCCESS' : 'INFO'}
					size="sm"
				/>
			),
		},
		{
			key: 'email',
			header: 'Email',
			sortable: true,
			render: (_, row) => (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<Typography sx={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
						{showEmailsFor.has(row.id) ? row.email : maskEmail(row.email)}
					</Typography>
					<IconButton
						size="small"
						onClick={() => toggleEmailVisibility(row.id)}
						title="Toggle email visibility"
					>
						{showEmailsFor.has(row.id) ? (
							<EyeOff style={{ width: 15, height: 15 }} />
						) : (
							<Eye style={{ width: 15, height: 15 }} />
						)}
					</IconButton>
					{showEmailsFor.has(row.id) && (
						<IconButton
							size="small"
							onClick={() => copyToClipboard(row.email, row.id)}
							title="Copy email"
						>
							{copiedEmail === row.id ? (
								<Check style={{ color: 'green', width: 15, height: 15 }} />
							) : (
								<Copy style={{ color: 'var(--accent-gold)', width: 15, height: 15 }} />
							)}
						</IconButton>
					)}
				</Box>
			),
		},
		{
			key: 'shipments',
			header: 'Shipments',
			sortable: true,
			render: (_, row) => (
				<Typography sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
					{row._count?.shipments ?? 0}
				</Typography>
			),
		},
		{
			key: 'createdAt',
			header: 'Joined',
			sortable: true,
			render: (_, row) => (
				<Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
					{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
				</Typography>
			),
		},
		{
			key: 'actions',
			header: 'Actions',
			align: 'right',
			render: (_, row) => (
				<Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
					<Link href={`/dashboard/users/${row.id}`} style={{ textDecoration: 'none' }}>
						<Button
							variant="outline"
							size="sm"
							icon={<Eye className="w-3.5 h-3.5" />}
						>
							View
						</Button>
					</Link>
					<Link href={`/dashboard/users/${row.id}/edit`} style={{ textDecoration: 'none' }}>
						<Button
							variant="outline"
							size="sm"
							icon={<Pencil className="w-3.5 h-3.5" />}
						>
							Edit
						</Button>
					</Link>
					<Button
						variant="outline"
						size="sm"
						icon={<Trash2 className="w-3.5 h-3.5" />}
						onClick={() => void handleDeleteUser(row)}
						sx={{
							color: 'var(--error)',
							borderColor: 'var(--error)',
							'&:hover': {
								bgcolor: 'rgba(var(--error-rgb), 0.1)',
							},
						}}
					>
						Delete
					</Button>
				</Box>
			),
		},
	], [showEmailsFor, copiedEmail]);

	const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
	const paginatedUsers = users;

	if (status === 'loading') {
		return (
			<DashboardSurface>
				<DashboardPanel>
					<CompactSkeleton />
				</DashboardPanel>
			</DashboardSurface>
		);
	}

	const role = session?.user?.role;
	if (!session || !hasPermission(role, 'users:manage')) {
		return null;
	}

	return (
		<DashboardSurface>
			<PageHeader
				showBreadcrumbs
				title="Internal Users"
				description="Manage staff accounts, administrative roles, and system permissions"
				actions={
					<Link href="/dashboard/users/new?accountType=user" style={{ textDecoration: 'none' }}>
						<Button variant="primary" icon={<UserPlus className="w-4 h-4" />}>
							Create Internal User
						</Button>
					</Link>
				}
			/>

			{/* Stats Grid */}
			<DashboardGrid className="grid-cols-2 md:grid-cols-4">
				<StatsCard
					icon={<UsersIcon className="w-5 h-5" />}
					title="Total Internal Users"
					value={totalUsers}
					variant="default"
				/>
				<StatsCard
					icon={<Shield className="w-5 h-5" />}
					title="Admin Accounts"
					value={adminsCount}
					variant="info"
				/>
				<StatsCard
					icon={<User className="w-5 h-5" />}
					title="Staff Accounts"
					value={regularUsersCount}
					variant="success"
				/>
				<StatsCard
					icon={<UsersIcon className="w-5 h-5" />}
					title="Active Page Count"
					value={users.length}
					variant="warning"
				/>
			</DashboardGrid>

			{/* Search Panel */}
			<DashboardPanel
				title="Directory Search"
				description="Find internal users by name or email address"
			>
				<SmartSearch
					onSearch={handleSearch}
					placeholder="Search internal users by name or email..."
					showTypeFilter={false}
					showStatusFilter={false}
					showDateFilter
					showPriceFilter={false}
					showUserFilter={false}
					defaultType="users"
				/>
			</DashboardPanel>

			{/* Results Panel */}
			<DashboardPanel title={`All Internal Users (${totalUsers})`} fullHeight>
				{loading ? (
					<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
						{[...Array(6)].map((_, i) => (
							<SkeletonCard key={i} />
						))}
					</Box>
				) : paginatedUsers.length === 0 ? (
					<Box sx={{ minHeight: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
						<User style={{ width: 48, height: 48, color: 'var(--text-secondary)', opacity: 0.5 }} />
						<Typography sx={{ color: 'var(--text-secondary)' }}>No internal users found</Typography>
						<Link href="/dashboard/users/new?accountType=user" style={{ textDecoration: 'none' }}>
							<Button variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />}>
								Create Internal User
							</Button>
						</Link>
					</Box>
				) : (
					<>
						<div className="hidden lg:block">
							<DataTable
								data={paginatedUsers}
								columns={userColumns}
								keyField="id"
							/>
						</div>
						<Box
							sx={{
								display: { xs: 'grid', lg: 'none' },
								gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
								gap: 2,
							}}
						>
							{paginatedUsers.map((user, index) => (
								<UserCard
									key={user.id}
									user={user}
									index={index}
									highlighted={highlightedUserId === user.id}
									showEmail={showEmailsFor.has(user.id)}
									copiedEmail={copiedEmail}
									onToggleEmail={toggleEmailVisibility}
									onCopyEmail={copyToClipboard}
									onDelete={() => void handleDeleteUser(user)}
								/>
							))}
						</Box>

						{/* Pagination Controls */}
						<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: '1px solid var(--border)' }}>
							<Button variant="outline" size="sm" onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); fetchUsers(currentPage - 1, searchFilters.query); }} disabled={currentPage === 1}>
								Previous
							</Button>
							<Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Page {currentPage} of {totalPages}</Typography>
							<Button variant="outline" size="sm" onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); fetchUsers(currentPage + 1, searchFilters.query); }} disabled={currentPage === totalPages}>
								Next
							</Button>
						</Box>
					</>
				)}
			</DashboardPanel>
		</DashboardSurface>
	);
}
