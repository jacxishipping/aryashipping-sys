'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Box, Avatar, Divider } from '@mui/material';
import {
	User,
	Mail,
	Phone,
	MapPin,
	Shield,
	Calendar,
	Save,
	RotateCcw,
	Image as ImageIcon,
	Key,
	Copy,
	RefreshCw,
	Upload,
} from 'lucide-react';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, Breadcrumbs, toast, EmptyState, StatsCard, DashboardPageSkeleton, FormField } from '@/components/design-system';
import { formatLoginCode } from '@/lib/loginCode';
import NotificationComposer from '@/components/notifications/NotificationComposer';

type ProfileFormState = {
	name: string;
	phone: string;
	address: string;
	city: string;
	country: string;
	image: string;
};

type PasswordFormState = {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
};

type ProfileResponse = {
	user: {
		id: string;
		name: string | null;
		email: string;
		image: string | null;
		role: string;
		phone: string | null;
		address: string | null;
		city: string | null;
		country: string | null;
		loginCode: string | null;
		createdAt: string;
		updatedAt: string;
	};
};

const initialFormState: ProfileFormState = {
	name: '',
	phone: '',
	address: '',
	city: '',
	country: '',
	image: '',
};

const initialPasswordFormState: PasswordFormState = {
	currentPassword: '',
	newPassword: '',
	confirmPassword: '',
};

export default function ProfilePage() {
	const { data: session, status, update: updateSession } = useSession();
	const router = useRouter();
	const [profile, setProfile] = useState<ProfileResponse['user'] | null>(null);
	const [form, setForm] = useState<ProfileFormState>(initialFormState);
	const [passwordForm, setPasswordForm] = useState<PasswordFormState>(initialPasswordFormState);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [savingPassword, setSavingPassword] = useState(false);
	const [generatingCode, setGeneratingCode] = useState(false);
	const [uploadingAvatar, setUploadingAvatar] = useState(false);
	const avatarInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (status === 'loading') return;
		if (!session) {
			router.replace('/auth/signin?callbackUrl=/dashboard/profile');
			return;
		}

		const fetchProfile = async () => {
			try {
				setLoading(true);
				const response = await fetch('/api/profile', { cache: 'no-store' });
				const payload = (await response.json()) as ProfileResponse & { message?: string };
				if (!response.ok || !payload.user) {
					throw new Error(payload.message ?? 'Failed to load profile');
				}

				setProfile(payload.user);
				setForm({
					name: payload.user.name ?? '',
					phone: payload.user.phone ?? '',
					address: payload.user.address ?? '',
					city: payload.user.city ?? '',
					country: payload.user.country ?? '',
					image: payload.user.image ?? '',
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unable to fetch profile information';
				toast.error(message);
			} finally {
				setLoading(false);
			}
		};

		fetchProfile();
	}, [session, status, router]);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.target;
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		setUploadingAvatar(true);
		try {
			const uploadData = new FormData();
			uploadData.append('file', file);
			const response = await fetch('/api/profile/avatar', { method: 'POST', body: uploadData });
			const payload = (await response.json()) as { user?: { image?: string | null }; message?: string };

			if (!response.ok || !payload.user?.image) {
				throw new Error(payload.message || 'Failed to upload profile image');
			}

			setProfile((current) => current ? { ...current, image: payload.user!.image || null } : current);
			setForm((current) => ({ ...current, image: payload.user!.image || '' }));
			await updateSession({ image: payload.user.image });
			toast.success('Profile image updated');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Unable to upload profile image');
		} finally {
			setUploadingAvatar(false);
			event.target.value = '';
		}
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!profile) return;

		setSaving(true);

		try {
			const response = await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form),
			});

			const payload = (await response.json()) as ProfileResponse & { message?: string };

			if (!response.ok || !payload.user) {
				throw new Error(payload.message ?? 'Failed to update profile');
			}

			setProfile(payload.user);
			setForm({
				name: payload.user.name ?? '',
				phone: payload.user.phone ?? '',
				address: payload.user.address ?? '',
				city: payload.user.city ?? '',
				country: payload.user.country ?? '',
				image: payload.user.image ?? '',
			});
			toast.success('Profile updated successfully');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'An unexpected error occurred';
			toast.error(message);
		} finally {
			setSaving(false);
		}
	};

	const handleReset = () => {
		if (!profile) return;
		setForm({
			name: profile.name ?? '',
			phone: profile.phone ?? '',
			address: profile.address ?? '',
			city: profile.city ?? '',
			country: profile.country ?? '',
			image: profile.image ?? '',
		});
		toast.info('Form reset to saved values');
	};

	const handlePasswordFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.target;
		setPasswordForm((prev) => ({ ...prev, [name]: value }));
	};

	const handlePasswordReset = () => {
		setPasswordForm(initialPasswordFormState);
		toast.info('Password form cleared');
	};

	const handlePasswordSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			toast.error('New password and confirmation do not match');
			return;
		}

		setSavingPassword(true);

		try {
			const response = await fetch('/api/profile/password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(passwordForm),
			});

			const payload = (await response.json()) as { message?: string };

			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to update password');
			}

			setPasswordForm(initialPasswordFormState);
			toast.success(payload.message ?? 'Password updated successfully');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to update password';
			toast.error(message);
		} finally {
			setSavingPassword(false);
		}
	};

	const handleCopyLoginCode = () => {
		if (!profile?.loginCode) return;
		navigator.clipboard.writeText(profile.loginCode);
		toast.success('Login code copied to clipboard');
	};

	const handleGenerateLoginCode = async () => {
		if (!profile || !session?.user) return;
		
		setGeneratingCode(true);
		try {
			const response = await fetch('/api/users/login-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: session.user.id }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to generate login code');
			}

			// Refresh profile to get new code
			const profileResponse = await fetch('/api/profile', { cache: 'no-store' });
			const profileData = (await profileResponse.json()) as ProfileResponse;
			
			if (profileResponse.ok && profileData.user) {
				setProfile(profileData.user);
				toast.success('Login code generated successfully');
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to generate login code';
			toast.error(message);
		} finally {
			setGeneratingCode(false);
		}
	};

	if (status === 'loading' || loading) {
		return <DashboardPageSkeleton />;
	}

	if (!profile) {
		return (
			<DashboardSurface>
				<EmptyState
					icon={<User className="w-12 h-12" />}
					title="Profile Unavailable"
					description="We could not load your profile details at the moment."
				/>
			</DashboardSurface>
		);
	}

	const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	return (
		<DashboardSurface>
			{/* Breadcrumbs */}
			<Box sx={{ px: 2, pt: 2 }}>
				<Breadcrumbs />
			</Box>

			<PageHeader
				title="Profile"
				description="Manage your personal information and account settings"
			/>

			{/* Account Stats */}
			<Box sx={{ px: 2, mb: 3 }}>
				<DashboardGrid className="grid-cols-1 md:grid-cols-3">
					<StatsCard
						icon={<Mail style={{ fontSize: 18 }} />}
						title="Email"
						value={profile.email}
						variant="info"
						size="md"
					/>
					<StatsCard
						icon={<Shield style={{ fontSize: 18 }} />}
						title="Role"
						value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
						variant="success"
						size="md"
					/>
					<StatsCard
						icon={<Calendar style={{ fontSize: 18 }} />}
						title="Member Since"
						value={memberSince}
						variant="default"
						size="md"
					/>
				</DashboardGrid>
			</Box>

			<Box sx={{ px: 2, pb: 4 }}>
				<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
					{/* Main Profile Form */}
					<Box>
						<DashboardPanel
							title="Personal Information"
							description="Update your personal details and contact information"
						>
							<Box component="form" onSubmit={handleSubmit}>
								<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
									{/* Avatar Section */}
									<Box>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
											<Avatar
												sx={{
													width: 80,
													height: 80,
													bgcolor: 'var(--accent-gold)',
													fontSize: '2rem',
													fontWeight: 600,
												}}
												src={profile.image || undefined}
											>
												{(profile.name || profile.email)[0].toUpperCase()}
											</Avatar>
											<Box>
												<Box sx={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', mb: 0.5 }}>
													{profile.name || 'User'}
												</Box>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
													{profile.email}
												</Box>
												<input
													ref={avatarInputRef}
													type="file"
													accept="image/jpeg,image/png,image/webp"
													onChange={handleAvatarUpload}
													className="sr-only"
												/>
												<Button
													type="button"
													variant="outline"
													size="sm"
													icon={<Upload className="w-4 h-4" />}
													onClick={() => avatarInputRef.current?.click()}
													disabled={uploadingAvatar}
													sx={{ mt: 1.25 }}
												>
													{uploadingAvatar ? 'Uploading...' : 'Change photo'}
												</Button>
											</Box>
										</Box>
									</Box>

									<Divider sx={{ borderColor: 'var(--border)' }} />

									{/* Name & Phone */}
									<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
										<FormField
											label="Full Name"
											name="name"
											value={form.name}
											onChange={handleChange}
											placeholder="Enter your full name"
											leftIcon={<User className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>

										<FormField
											label="Phone Number"
											name="phone"
											value={form.phone}
											onChange={handleChange}
											placeholder="+1 (555) 123-4567"
											leftIcon={<Phone className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>
									</Box>

									{/* Address */}
									<Box>
										<FormField
											label="Address"
											name="address"
											value={form.address}
											onChange={handleChange}
											placeholder="123 Main Street"
											leftIcon={<MapPin className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>
									</Box>

									{/* City & Country */}
									<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
										<FormField
											label="City"
											name="city"
											value={form.city}
											onChange={handleChange}
											placeholder="New York"
											leftIcon={<MapPin className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>

										<FormField
											label="Country"
											name="country"
											value={form.country}
											onChange={handleChange}
											placeholder="United States"
											leftIcon={<MapPin className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>
									</Box>

									{/* Image URL */}
									<Box>
										<FormField
											label="Profile Image URL"
											name="image"
											value={form.image}
											onChange={handleChange}
											placeholder="https://example.com/image.jpg"
											leftIcon={<ImageIcon className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>
									</Box>

									{/* Action Buttons */}
									<Box>
										<Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
											<Button
												type="button"
												variant="outline"
												size="sm"
												icon={<RotateCcw className="w-4 h-4" />}
												onClick={handleReset}
												disabled={saving}
											>
												Reset
											</Button>
											<Button
												type="submit"
												variant="primary"
												size="sm"
												icon={<Save className="w-4 h-4" />}
												disabled={saving}
											>
												{saving ? 'Saving...' : 'Save Changes'}
											</Button>
										</Box>
									</Box>
								</Box>
							</Box>
						</DashboardPanel>
					</Box>

					{/* Sidebar - Security Tips */}
					<Box>
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
							<DashboardPanel
								title="Security Tips"
								description="Keep your account safe"
							>
								<Box sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
									<ul style={{ listStyle: 'disc', paddingLeft: '1.25rem', margin: 0 }}>
										<li style={{ marginBottom: '0.5rem' }}>Use a strong, unique password</li>
										<li style={{ marginBottom: '0.5rem' }}>Enable two-factor authentication</li>
										<li style={{ marginBottom: '0.5rem' }}>Keep your contact info up to date</li>
										<li style={{ marginBottom: '0.5rem' }}>Review account activity regularly</li>
									</ul>
								</Box>
							</DashboardPanel>

							<DashboardPanel
								title="Password"
								description="Set a new password for your account"
							>
								<Box component="form" onSubmit={handlePasswordSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
									<FormField
										label="Current Password"
										name="currentPassword"
										type="password"
										value={passwordForm.currentPassword}
										onChange={handlePasswordFieldChange}
										placeholder={profile.role === 'user' ? 'Optional if you signed in with a code' : 'Enter your current password'}
										helperText={profile.role === 'user' ? 'Customers who signed in with an 8-character code can set a password without entering a current one.' : 'Required before saving a new password.'}
										leftIcon={<Key className="w-4 h-4 text-[var(--text-secondary)]" />}
									/>

									<FormField
										label="New Password"
										name="newPassword"
										type="password"
										value={passwordForm.newPassword}
										onChange={handlePasswordFieldChange}
										placeholder="At least 8 characters"
										helperText="Choose a password with at least 8 characters."
										leftIcon={<Key className="w-4 h-4 text-[var(--text-secondary)]" />}
									/>

									<FormField
										label="Confirm New Password"
										name="confirmPassword"
										type="password"
										value={passwordForm.confirmPassword}
										onChange={handlePasswordFieldChange}
										placeholder="Re-enter your new password"
										leftIcon={<Key className="w-4 h-4 text-[var(--text-secondary)]" />}
									/>

									<Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
										<Button
											type="button"
											variant="outline"
											size="sm"
											icon={<RotateCcw className="w-4 h-4" />}
											onClick={handlePasswordReset}
											disabled={savingPassword}
										>
											Reset
										</Button>
										<Button
											type="submit"
											variant="primary"
											size="sm"
											icon={<Key className="w-4 h-4" />}
											disabled={savingPassword}
										>
											{savingPassword ? 'Updating...' : 'Update Password'}
										</Button>
									</Box>
								</Box>
							</DashboardPanel>

							{profile.role === 'user' && (
								<DashboardPanel
									title="Support Notifications"
									description="Send a realtime message to the Jacxi team"
								>
									<NotificationComposer mode="customer-to-support" />
								</DashboardPanel>
							)}

							{/* Login Code Panel */}
							<DashboardPanel
								title="Login Code"
								description="Quick access code for simplified login"
							>
								<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
									{profile.loginCode ? (
										<>
											<Box>
												<Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 1 }}>
													Your Login Code
												</Box>
												<Box 
													sx={{ 
														display: 'flex',
														alignItems: 'center',
														gap: 1,
														bgcolor: 'var(--background)',
														border: '2px solid var(--accent-gold)',
														borderRadius: 2,
														p: 2,
													}}
												>
													<Key className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
													<Box 
														sx={{ 
															fontSize: '1.5rem', 
															fontWeight: 700,
															color: 'var(--text-primary)',
															fontFamily: 'monospace',
															letterSpacing: '0.2em',
															flex: 1,
														}}
													>
														{formatLoginCode(profile.loginCode)}
													</Box>
													<Button
														variant="ghost"
														size="sm"
														icon={<Copy className="w-4 h-4" />}
														onClick={handleCopyLoginCode}
													>
														Copy
													</Button>
												</Box>
											</Box>
											<Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
												Use this code to login at{' '}
												<Box component="span" sx={{ color: 'var(--accent-gold)', fontWeight: 500 }}>
													/auth/simple-login
												</Box>
												. Keep it secure and don't share it with others.
											</Box>
											{session?.user.role === 'admin' && (
												<>
													<Divider sx={{ borderColor: 'var(--border)' }} />
													<Button
														variant="outline"
														size="sm"
														icon={<RefreshCw className="w-4 h-4" />}
														onClick={handleGenerateLoginCode}
														disabled={generatingCode}
														fullWidth
													>
														{generatingCode ? 'Generating...' : 'Regenerate Code'}
													</Button>
												</>
											)}
										</>
									) : (
										<>
											<Box sx={{ textAlign: 'center', py: 2 }}>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 2 }}>
													No login code set yet
												</Box>
												{session?.user.role === 'admin' && (
													<Button
														variant="primary"
														size="sm"
														icon={<Key className="w-4 h-4" />}
														onClick={handleGenerateLoginCode}
														disabled={generatingCode}
													>
														{generatingCode ? 'Generating...' : 'Generate Login Code'}
													</Button>
												)}
												{session?.user.role !== 'admin' && (
													<Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
														Contact an administrator to set up a login code
													</Box>
												)}
											</Box>
										</>
									)}
								</Box>
							</DashboardPanel>

							<DashboardPanel
								title="Account Info"
							>
								<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
									<Box>
										<Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>
											Account ID
										</Box>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
											{profile.id.slice(0, 8)}...
										</Box>
									</Box>
									<Divider sx={{ borderColor: 'var(--border)' }} />
									<Box>
										<Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>
											Last Updated
										</Box>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
											{new Date(profile.updatedAt).toLocaleDateString()}
										</Box>
									</Box>
								</Box>
							</DashboardPanel>
						</Box>
					</Box>
				</Box>
			</Box>
		</DashboardSurface>
	);
}
