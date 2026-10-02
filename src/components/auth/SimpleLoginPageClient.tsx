'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Key, Eye, EyeOff, ArrowRight, LogIn, Loader2 } from 'lucide-react';
import { Alert, Button } from '@/components/design-system';
import { getPortalBrandIdentity } from '@/lib/partner-portal-branding';

type PortalLoginBranding = {
  id: string;
  name: string;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
};

type SimpleLoginPageClientProps = {
  portal: PortalLoginBranding | null;
};

export default function SimpleLoginPageClient({ portal }: SimpleLoginPageClientProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loginCode, setLoginCode] = useState('');
	const [showCode, setShowCode] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const brand = useMemo(() => getPortalBrandIdentity(portal), [portal]);
	const callbackUrl = searchParams.get('callbackUrl');
	const redirectTarget = callbackUrl || (portal?.id ? `/portal/${portal.id}` : '/dashboard');
	const staffLoginHref = useMemo(() => {
		const nextSearchParams = new URLSearchParams();
		if (callbackUrl) {
			nextSearchParams.set('callbackUrl', callbackUrl);
		}
		if (portal?.id) {
			nextSearchParams.set('portalId', portal.id);
		}

		return `/auth/signin${nextSearchParams.size ? `?${nextSearchParams.toString()}` : ''}`;
	}, [callbackUrl, portal?.id]);

	const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
		setLoginCode(sanitized.slice(0, 8));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		const clean = loginCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
		if (clean.length !== 8) {
			setError('Login code must be 8 characters');
			setIsLoading(false);
			return;
		}

		try {
			const result = await signIn('credentials', {
				loginCode: clean,
				redirect: false,
				callbackUrl: redirectTarget,
			});

			if (result?.error || !result?.ok) {
				setError('Invalid login code. Please check your code and try again.');
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

	if (!portal) {
		return (
			<div className="min-h-screen bg-[var(--background)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
				<motion.div
					initial={{ opacity: 1, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="max-w-md w-full relative z-10"
				>
					<div className="relative rounded-2xl bg-[var(--panel)] border border-[rgba(var(--panel-rgb),0.9)] shadow-xl p-6 sm:p-8 overflow-hidden">
						<div className="relative z-10">
							<div className="text-center mb-6">
								<h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2">
									Login With Code
								</h1>
								<p className="text-[var(--text-secondary)] text-sm">
									Enter your 8-character access code to continue.
								</p>
							</div>

							{error && (
								<div className="mb-4">
									<Alert severity="error">{error}</Alert>
								</div>
							)}

							<form onSubmit={handleSubmit} className="flex flex-col gap-5">
								<div>
									<label
										htmlFor="loginCode"
										className="block text-sm font-medium text-[var(--text-primary)] mb-2"
									>
										8-Character Code
									</label>
									<div className="relative flex items-center">
										<div className="absolute left-3.5 text-[var(--text-secondary)] pointer-events-none">
											<Key className="w-5 h-5" />
										</div>
										<input
											id="loginCode"
											type={showCode ? 'text' : 'password'}
											value={loginCode}
											onChange={handleCodeChange}
											required
											placeholder="Enter your 8-character code"
											autoComplete="off"
											autoFocus
											className="w-full pl-11 pr-11 py-3 bg-[var(--background)] rounded-xl border border-[var(--border)] text-[var(--text-primary)] tracking-[0.28em] font-semibold text-center placeholder:tracking-normal placeholder:text-[var(--text-secondary)] placeholder:font-normal focus:outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] transition-colors"
										/>
										<button
											type="button"
											onClick={() => setShowCode(!showCode)}
											className="absolute right-3.5 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
										>
											{showCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
										</button>
									</div>
								</div>

								<Button
									type="submit"
									disabled={isLoading || loginCode.length !== 8}
									loading={isLoading}
									variant="primary"
									size="lg"
									fullWidth
									icon={!isLoading ? <ArrowRight className="w-5 h-5" /> : undefined}
									iconPosition="end"
								>
									Login with Code
								</Button>
							</form>

							<div className="text-center pt-4 mt-4 border-t border-[var(--border)]">
								<p className="text-sm text-[var(--text-secondary)] mb-1">
									Prefer email and password?
								</p>
								<button
									type="button"
									onClick={() => router.push('/auth/signin')}
									className="bg-transparent border-0 text-[var(--accent-gold)] font-medium cursor-pointer text-sm underline transition-colors hover:opacity-90"
								>
									Back to Sign In
								</button>
							</div>
						</div>
					</div>
				</motion.div>
			</div>
		);
	}

	return (
		<div
			style={{
				background: `radial-gradient(circle at top left, rgba(${brand.accentRgb},0.22), transparent 26%), radial-gradient(circle at 82% 18%, rgba(${brand.accentRgb},0.12), transparent 22%), linear-gradient(180deg, #f8fafc 0%, #eef2f7 50%, #ffffff 100%)`,
			}}
			className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
		>
			<motion.div
				initial={{ opacity: 1, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				className="max-w-xl w-full relative z-10"
			>
				<div className="relative rounded-3xl bg-white/90 backdrop-blur-xl border border-white/85 shadow-2xl p-8 sm:p-12 overflow-hidden">
					<div
						style={{
							background: `radial-gradient(circle, rgba(${brand.accentRgb},0.24), rgba(${brand.accentRgb},0.02) 70%, transparent 75%)`,
						}}
						className="absolute -right-10 -bottom-16 w-56 h-56 rounded-full pointer-events-none"
					/>
					<div className="relative z-10">
						<div className="text-center mb-8 grid gap-3">
							<div className="flex justify-center">
								{brand.logoUrl ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										src={brand.logoUrl}
										alt={`${brand.companyLabel} logo`}
										className="w-20 h-20 rounded-2xl object-cover bg-white/90 border border-slate-900/10 shadow-lg"
									/>
								) : (
									<div
										style={{
											backgroundColor: `rgba(${brand.accentRgb}, 0.14)`,
											color: brand.accentColor,
										}}
										className="inline-flex items-center justify-center w-20 h-20 rounded-2xl shadow-md"
									>
										<Key className="w-10 h-10" />
									</div>
								)}
							</div>
							<span
								style={{ color: brand.accentColor }}
								className="text-[0.78rem] font-bold tracking-[0.16em] uppercase"
							>
								{portal ? `${brand.companyLabel} Portal` : 'Customer Login'}
							</span>
							<h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none m-0">
								{portal ? `Access ${brand.companyLabel}` : 'Enter Your Login Code'}
							</h1>
							<p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-sm mx-auto m-0">
								{portal
									? 'Use the 8-character code shared by your portal team to open your branded customer workspace.'
									: 'Enter your 8-character login code to open your customer workspace.'}
							</p>
						</div>

						{error && (
							<div className="mb-6">
								<Alert severity="error">{error}</Alert>
							</div>
						)}

						<form onSubmit={handleSubmit} className="flex flex-col gap-6">
							<div>
								<label htmlFor="loginCode" className="block text-base font-bold text-[var(--text-primary)] mb-2">
									Login Code
								</label>
								<div className="relative flex items-center">
									<div
										style={{ color: brand.accentColor }}
										className="absolute left-4 pointer-events-none"
									>
										<Key className="w-6 h-6" />
									</div>
									<input
										id="loginCode"
										type={showCode ? 'text' : 'password'}
										value={loginCode}
										onChange={handleCodeChange}
										required
										placeholder="Enter 8-character code"
										autoComplete="off"
										autoFocus
										style={{
											borderColor: `rgba(${brand.accentRgb}, 0.25)`,
										}}
										className="w-full pl-12 pr-12 py-3.5 bg-white/90 rounded-2xl border-2 text-[var(--text-primary)] tracking-[0.3em] text-2xl font-bold text-center placeholder:tracking-normal placeholder:text-[var(--text-secondary)] placeholder:text-base placeholder:font-normal focus:outline-none transition-colors"
									/>
									<button
										type="button"
										onClick={() => setShowCode(!showCode)}
										style={{ color: brand.accentColor }}
										className="absolute right-4 hover:opacity-80 transition-opacity"
									>
										{showCode ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
									</button>
								</div>
								<span className="block mt-2 text-[var(--text-secondary)] text-sm text-center">
									{loginCode.length}/8 characters
								</span>
							</div>

							<button
								type="submit"
								disabled={isLoading || loginCode.length !== 8}
								style={{
									background: `linear-gradient(135deg, ${brand.accentColor}, rgba(${brand.accentRgb},0.82))`,
								}}
								className="w-full text-white font-extrabold py-3.5 px-6 text-lg rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
							>
								{isLoading ? (
									<div className="flex items-center gap-2">
										<Loader2 className="w-6 h-6 animate-spin text-white" />
										<span>Logging in...</span>
									</div>
								) : (
									<>
										<span>Open Portal</span>
										<ArrowRight className="w-5 h-5" />
									</>
								)}
							</button>
						</form>

						<div
							style={{ borderColor: `rgba(${brand.accentRgb}, 0.14)` }}
							className="text-center pt-6 mt-6 border-t grid gap-3"
						>
							<p className="text-sm text-[var(--text-secondary)] m-0">
								Prefer email and password instead?
							</p>
							<Link href={staffLoginHref} className="no-underline">
								<Button
									variant="outline"
									size="lg"
									icon={<LogIn className="w-4 h-4" />}
								>
									Sign In With Email
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</motion.div>
		</div>
	);
}