"use client";

import { useEffect, useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Key } from 'lucide-react';
import SiteLogo from '@/components/brand/SiteLogo';
import { Alert, Button } from '@/components/design-system';

export default function SignInPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const callbackUrl = searchParams.get('callbackUrl');
	const portalId = searchParams.get('portalId');
	const redirectTarget = callbackUrl || (portalId ? `/portal/${portalId}` : '/dashboard');
	const simpleLoginHref = useMemo(() => {
		const nextSearchParams = new URLSearchParams();
		if (callbackUrl) {
			nextSearchParams.set('callbackUrl', callbackUrl);
		}
		if (portalId) {
			nextSearchParams.set('portalId', portalId);
		}

		return `/auth/simple-login${nextSearchParams.size ? `?${nextSearchParams.toString()}` : ''}`;
	}, [callbackUrl, portalId]);

	// Auto-detect if running inside Telegram Mini App / WebApp
	useEffect(() => {
		const tg = typeof window !== 'undefined' ? (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp : undefined;
		const hasTgHash = typeof window !== 'undefined' && window.location.hash.includes('tgWebAppData=');
		if (tg?.initData || hasTgHash) {
			const target = callbackUrl || '/dashboard';
			router.replace(`/telegram-app?target=${encodeURIComponent(target)}`);
		}
	}, [callbackUrl, router]);

	const cleanCode = useMemo(() => {
		return email.trim().replace(/[\s\-_]/g, '').toUpperCase();
	}, [email]);

	const isAccessCode = useMemo(() => {
		return cleanCode.length === 8 && /^[A-Z0-9]{8}$/.test(cleanCode);
	}, [cleanCode]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		try {
			// If input looks like an 8-character access code
			if (isAccessCode) {
				const codeResult = await signIn('credentials', {
					loginCode: cleanCode,
					redirect: false,
					callbackUrl: redirectTarget,
				});

				if (codeResult?.ok && !codeResult.error) {
					router.replace(codeResult?.url || redirectTarget);
					router.refresh();
					return;
				} else {
					setError('Invalid login code. Please check your 8-character code and try again.');
					return;
				}
			}

			const trimmedEmail = email.trim();
			if (!trimmedEmail) {
				setError('Please enter your email address or 8-character access code');
				return;
			}

			if (!password) {
				setError('Please enter your password');
				return;
			}

			// Normalize email to lowercase for consistent matching
			const normalizedEmail = trimmedEmail.toLowerCase();
			
			const result = await signIn('credentials', {
				email: normalizedEmail,
				password,
				redirect: false,
				callbackUrl: redirectTarget,
			});

			if (result?.error || !result?.ok) {
				setError('Invalid email or password');
			} else {
				router.replace(result?.url || redirectTarget);
				router.refresh();
			}
		} catch {
			setError('An error occurred. Please try again.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[var(--background)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
			<motion.div
				initial={{ opacity: 1 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 1.2 }}
				className="absolute inset-0 pointer-events-none"
			>
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(var(--accent-gold-rgb),0.08)_0%,transparent_60%)]" />
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_100%_100%,rgba(var(--accent-gold-rgb),0.04)_0%,transparent_70%)]" />
			</motion.div>

			{/* Main Content */}
			<motion.div
				initial={{ opacity: 1, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				className="max-w-md w-full relative z-10"
			>
				{/* Glass Card */}
				<div className="relative rounded-3xl backdrop-blur-xl bg-[rgba(var(--panel-rgb),0.92)] border border-[rgba(var(--accent-gold-rgb),0.15)] shadow-[0_32px_80px_rgba(0,0,0,0.16)] p-6 sm:p-8 overflow-hidden">
					<div className="relative z-10">
						{/* Header */}
						<div className="text-center mb-6">
							<div className="flex justify-center mb-4">
								<SiteLogo variant="dashboard" className="w-[120px]" priority />
							</div>
							<h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[var(--text-primary)] to-[var(--accent-gold)] bg-clip-text text-transparent mb-1">
								{t('auth.signIn')}
							</h1>
							<p className="text-sm text-[var(--text-secondary)]">
								{t('auth.signInSubtitle')}
							</p>
						</div>

						{/* Error Message */}
						{error && (
							<div className="mb-4">
								<Alert severity="error">{error}</Alert>
							</div>
						)}

						{/* Form */}
						<form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
							{/* Email or Access Code Field */}
							<div>
								<div className="flex justify-between items-center mb-1.5">
									<label
										htmlFor="email"
										className="block text-xs font-semibold text-[var(--text-primary)]"
									>
										{isAccessCode ? '8-Character Access Code' : `${t('auth.email')} or Access Code`}
									</label>
									{isAccessCode && (
										<span className="text-[11px] font-semibold text-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.12)] px-2 py-0.5 rounded">
											Access code detected
										</span>
									)}
								</div>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-secondary)]">
										{isAccessCode ? (
											<Key className="w-4 h-4 text-[var(--accent-gold)]" />
										) : (
											<Mail className="w-4 h-4" />
										)}
									</div>
									<input
										id="email"
										type="text"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										placeholder="Enter email or 8-character code (e.g. C24FBSUX)"
										autoComplete="username"
										className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--background)] border border-[rgba(var(--panel-rgb),0.9)] hover:border-[rgba(var(--accent-gold-rgb),0.3)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.15)] outline-none text-sm text-[var(--text-primary)] transition-all ${
											isAccessCode ? 'tracking-widest font-bold' : ''
										}`}
									/>
								</div>
							</div>

							{/* Password Field - Hidden/not required when entering an 8-character access code */}
							{!isAccessCode && (
								<div>
									<label
										htmlFor="password"
										className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5"
									>
										{t('auth.password')}
									</label>
									<div className="relative">
										<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-secondary)]">
											<Lock className="w-4 h-4" />
										</div>
										<input
											id="password"
											type={showPassword ? 'text' : 'password'}
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder="Enter your password"
											autoComplete="current-password"
											className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--background)] border border-[rgba(var(--panel-rgb),0.9)] hover:border-[rgba(var(--accent-gold-rgb),0.3)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.15)] outline-none text-sm text-[var(--text-primary)] transition-all"
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
										>
											{showPassword ? (
												<EyeOff className="w-4 h-4" />
											) : (
												<Eye className="w-4 h-4" />
											)}
										</button>
									</div>
								</div>
							)}

							{/* Submit Button */}
							<Button
								type="submit"
								variant="primary"
								size="lg"
								loading={isLoading}
								fullWidth
								icon={!isLoading ? <ArrowRight className="w-4 h-4" /> : undefined}
								iconPosition="end"
							>
								{isAccessCode ? 'Login with Access Code' : t('auth.signIn')}
							</Button>
						</form>

						{/* Sign Up Link */}
						<div className="text-center pt-4">
							<p className="text-xs text-[var(--text-secondary)]">
								{t('auth.dontHaveAccount')}{' '}
								<button
									type="button"
									onClick={() => router.push('/auth/signup')}
									className="text-[var(--accent-gold)] hover:underline font-medium transition-colors cursor-pointer"
								>
									{t('auth.signUp')}
								</button>
							</p>
						</div>

						{/* Short Code Login Link */}
						<div className="text-center pt-4 mt-4 border-t border-[var(--border)]">
							<p className="text-xs text-[var(--text-secondary)] mb-2">
								Have a login code?
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={() => router.push(simpleLoginHref)}
							>
								Login with 8-character code
							</Button>
						</div>
					</div>
				</div>
			</motion.div>
		</div>
	);
}


