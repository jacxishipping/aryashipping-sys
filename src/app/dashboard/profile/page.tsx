'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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

	const handleChange = (name: keyof ProfileFormState) => (value: string) => {
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

	const handlePasswordFieldChange = (name: keyof PasswordFormState) => (value: string) => {
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
			<div className="px-4 pt-4">
				<Breadcrumbs />
			</div>

			<PageHeader
				title="Profile"
				description="Manage your personal information and account settings"
			/>

			{/* Account Stats */}
			<div className="px-4 mb-6">
				<DashboardGrid className="grid-cols-1 md:grid-cols-3">
					<StatsCard
						icon={<Mail className="w-4 h-4" />}
						title="Email"
						value={profile.email}
						variant="info"
						size="md"
					/>
					<StatsCard
						icon={<Shield className="w-4 h-4" />}
						title="Role"
						value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
						variant="success"
						size="md"
					/>
					<StatsCard
						icon={<Calendar className="w-4 h-4" />}
						title="Member Since"
						value={memberSince}
						variant="default"
						size="md"
					/>
				</DashboardGrid>
			</div>

			<div className="px-4 pb-8">
				<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
					{/* Main Profile Form */}
					<div>
						<DashboardPanel
							title="Personal Information"
							description="Update your personal details and contact information"
						>
							<form onSubmit={handleSubmit}>
								<div className="flex flex-col gap-6">
									{/* Avatar Section */}
									<div>
										<div className="flex items-center gap-6">
											{profile.image ? (
												<img
													src={profile.image}
													alt={profile.name || 'User'}
													className="w-20 h-20 rounded-full object-cover border border-[var(--border)]"
												/>
											) : (
												<div className="w-20 h-20 rounded-full bg-[var(--accent-gold)] flex items-center justify-center text-2xl font-bold text-[var(--text-primary)]">
													{(profile.name || profile.email)[0].toUpperCase()}
												</div>
											)}
											<div>
												<div className="text-xl font-semibold text-[var(--text-primary)] mb-1">
													{profile.name || 'User'}
												</div>
												<div className="text-sm text-[var(--text-secondary)]">
													{profile.email}
												</div>
												<input
													ref={avatarInputRef}
													type="file"
													accept="image/jpeg,image/png,image/webp"
													onChange={handleAvatarUpload}
													className="sr-only"
												/>
												<div className="mt-3">
													<Button
														type="button"
														variant="outline"
														size="sm"
														icon={<Upload className="w-4 h-4" />}
														onClick={() => avatarInputRef.current?.click()}
														disabled={uploadingAvatar}
													>
														{uploadingAvatar ? 'Uploading...' : 'Change photo'}
													</Button>
												</div>
											</div>
										</div>
									</div>

									<hr className="border-[var(--border)]" />

									{/* Name & Phone */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<FormField
											label="Full Name"
											name="name"
											value={form.name}
											onChange={handleChange('name')}
											placeholder="Enter your full name"
											leftIcon={<User className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>

										<FormField
											label="Phone Number"
											name="phone"
											value={form.phone}
											onChange={handleChange('phone')}
											placeholder="+1 (555) 123-4567"
											leftIcon={<Phone className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>
									</div>

									{/* Address */}
									<div>
										<FormField
											label="Address"
											name="address"
											value={form.address}
											onChange={handleChange('address')}
											placeholder="123 Main Street"
											leftIcon={<MapPin className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>
									</div>

									{/* City & Country */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<FormField
											label="City"
											name="city"
											value={form.city}
											onChange={handleChange('city')}
											placeholder="New York"
											leftIcon={<MapPin className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>

										<FormField
											label="Country"
											name="country"
											value={form.country}
											onChange={handleChange('country')}
											placeholder="United States"
											leftIcon={<MapPin className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>
									</div>

									{/* Image URL */}
									<div>
										<FormField
											label="Profile Image URL"
											name="image"
											value={form.image}
											onChange={handleChange('image')}
											placeholder="https://example.com/image.jpg"
											leftIcon={<ImageIcon className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>
									</div>

									{/* Action Buttons */}
									<div>
										<div className="flex gap-4 justify-end mt-4">
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
										</div>
									</div>
								</div>
							</form>
						</DashboardPanel>
					</div>

					{/* Sidebar - Security Tips */}
					<div>
						<div className="flex flex-col gap-6">
							<DashboardPanel
								title="Security Tips"
								description="Keep your account safe"
							>
								<div className="text-[var(--text-secondary)] text-sm leading-relaxed">
									<ul className="list-disc pl-5 m-0 space-y-2">
										<li>Use a strong, unique password</li>
										<li>Enable two-factor authentication</li>
										<li>Keep your contact info up to date</li>
										<li>Review account activity regularly</li>
									</ul>
								</div>
							</DashboardPanel>

							<DashboardPanel
								title="Password"
								description="Set a new password for your account"
							>
								<form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5">
									<FormField
										label="Current Password"
										name="currentPassword"
										type="password"
										value={passwordForm.currentPassword}
										onChange={handlePasswordFieldChange('currentPassword')}
										placeholder={profile.role === 'user' ? 'Optional if you signed in with a code' : 'Enter your current password'}
										helperText={profile.role === 'user' ? 'Customers who signed in with an 8-character code can set a password without entering a current one.' : 'Required before saving a new password.'}
										leftIcon={<Key className="w-4 h-4 text-[var(--text-secondary)]" />}
									/>

									<FormField
										label="New Password"
										name="newPassword"
										type="password"
										value={passwordForm.newPassword}
										onChange={handlePasswordFieldChange('newPassword')}
										placeholder="At least 8 characters"
										helperText="Choose a password with at least 8 characters."
										leftIcon={<Key className="w-4 h-4 text-[var(--text-secondary)]" />}
									/>

									<FormField
										label="Confirm New Password"
										name="confirmPassword"
										type="password"
										value={passwordForm.confirmPassword}
										onChange={handlePasswordFieldChange('confirmPassword')}
										placeholder="Re-enter your new password"
										leftIcon={<Key className="w-4 h-4 text-[var(--text-secondary)]" />}
									/>

									<div className="flex gap-4 justify-end">
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
									</div>
								</form>
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
								<div className="flex flex-col gap-4">
									{profile.loginCode ? (
										<>
											<div>
												<div className="text-xs text-[var(--text-secondary)] mb-2">
													Your Login Code
												</div>
												<div className="flex items-center gap-2 bg-[var(--background)] border-2 border-[var(--accent-gold)] rounded-xl p-4">
													<Key className="w-5 h-5 text-[var(--accent-gold)]" />
													<div className="text-2xl font-bold text-[var(--text-primary)] font-mono tracking-widest flex-1">
														{formatLoginCode(profile.loginCode)}
													</div>
													<Button
														variant="ghost"
														size="sm"
														icon={<Copy className="w-4 h-4" />}
														onClick={handleCopyLoginCode}
													>
														Copy
													</Button>
												</div>
											</div>
											<div className="text-xs text-[var(--text-secondary)] leading-relaxed">
												Use this code to login at{' '}
												<span className="text-[var(--accent-gold)] font-medium">
													/auth/simple-login
												</span>
												. Keep it secure and don't share it with others.
											</div>
											{session?.user.role === 'admin' && (
												<>
													<hr className="border-[var(--border)]" />
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
											<div className="text-center py-4">
												<div className="text-sm text-[var(--text-secondary)] mb-4">
													No login code set yet
												</div>
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
													<div className="text-xs text-[var(--text-secondary)]">
														Contact an administrator to set up a login code
													</div>
												)}
											</div>
										</>
									)}
								</div>
							</DashboardPanel>

							<DashboardPanel
								title="Account Info"
							>
								<div className="flex flex-col gap-4">
									<div>
										<div className="text-xs text-[var(--text-secondary)] mb-1">
											Account ID
										</div>
										<div className="text-sm text-[var(--text-primary)] font-mono">
											{profile.id.slice(0, 8)}...
										</div>
									</div>
									<hr className="border-[var(--border)]" />
									<div>
										<div className="text-xs text-[var(--text-secondary)] mb-1">
											Last Updated
										</div>
										<div className="text-sm text-[var(--text-primary)]">
											{new Date(profile.updatedAt).toLocaleDateString()}
										</div>
									</div>
								</div>
							</DashboardPanel>
						</div>
					</div>
				</div>
			</div>
		</DashboardSurface>
	);
}
