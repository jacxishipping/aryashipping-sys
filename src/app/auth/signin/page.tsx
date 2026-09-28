"use client";

import { useEffect, useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Visibility, VisibilityOff, Email, Lock, ArrowForward, VpnKey } from '@mui/icons-material';
import SiteLogo from '@/components/brand/SiteLogo';
import { Alert, Button as DSButton } from '@/components/design-system';
import { Button, 
	TextField, 
	InputAdornment, 
	IconButton, 
	CircularProgress, 
	Box, 
	Typography,
	Paper
} from '@mui/material';

const textFieldStyles = {
	'& .MuiOutlinedInput-root': {
		bgcolor: 'var(--background)',
		borderRadius: 3,
		color: 'var(--text-primary)',
		'& fieldset': {
			borderColor: 'rgba(var(--panel-rgb), 0.9)',
			transition: 'all 200ms ease',
		},
		'&:hover fieldset': {
			borderColor: 'rgba(var(--accent-gold-rgb), 0.22)',
		},
		'&.Mui-focused': {
			boxShadow: '0 0 0 3px rgba(var(--accent-gold-rgb), 0.12)',
		},
		'&.Mui-focused fieldset': {
			borderColor: 'var(--accent-gold)',
			borderWidth: 2,
		},
		'& input': {
			color: 'var(--text-primary)',
			'&::placeholder': {
				color: 'var(--text-secondary)',
				opacity: 1,
			},
			'&:-webkit-autofill': {
				WebkitBoxShadow: '0 0 0 100px var(--background) inset',
				WebkitTextFillColor: 'var(--text-primary)',
			},
		},
	},
} as const;

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
		<Box
			sx={{
				minHeight: '100vh',
				bgcolor: 'var(--background)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				py: { xs: 6, sm: 10 },
				px: { xs: 2, sm: 3, lg: 4 },
				position: 'relative',
				overflow: 'hidden',
			}}
		>
			<motion.div
				initial={{ opacity: 1 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 1.2 }}
				style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
			>
				<Box
					sx={{
						position: 'absolute',
						inset: 0,
						background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(var(--accent-gold-rgb), 0.08) 0%, transparent 60%)',
					}}
				/>
				<Box
					sx={{
						position: 'absolute',
						inset: 0,
						background: 'radial-gradient(ellipse 55% 45% at 100% 100%, rgba(var(--accent-gold-rgb), 0.04) 0%, transparent 70%)',
					}}
				/>
			</motion.div>

			{/* Main Content */}
			<motion.div
				// Start visible so SSR HTML is never blank; animation only from a small offset
				initial={{ opacity: 1, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				style={{ maxWidth: 448, width: '100%', position: 'relative', zIndex: 10 }}
			>
				{/* Glass Card */}
				<Paper
					elevation={0}
					sx={{
						position: 'relative',
						borderRadius: 4,
						backdropFilter: 'blur(20px)',
						background: 'rgba(var(--panel-rgb), 0.92)',
						border: '1px solid rgba(var(--accent-gold-rgb), 0.15)',
						boxShadow: '0 32px 80px rgba(var(--text-primary-rgb), 0.16), 0 0 0 1px rgba(var(--accent-gold-rgb), 0.08)',
						p: { xs: 4, sm: 5 },
						overflow: 'hidden',
					}}
				>
					<Box sx={{ position: 'relative', zIndex: 1 }}>
						{/* Header */}
						<Box sx={{ textAlign: 'center', mb: 3 }}>
							<Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
								<SiteLogo variant="dashboard" className="w-[120px]" priority />
							</Box>
							<Typography
								variant="h3"
								sx={{
									fontSize: { xs: '1.875rem', sm: '2.25rem' },
									fontWeight: 700,
									background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent-gold) 100%)',
									WebkitBackgroundClip: 'text',
									WebkitTextFillColor: 'transparent',
									mb: 1,
								}}
							>
								{t('auth.signIn')}
							</Typography>
							<Typography
								variant="body1"
								sx={{
									color: 'var(--text-secondary)',
								}}
							>
								{t('auth.signInSubtitle')}
							</Typography>
						</Box>

						{/* Error Message */}
						{error && (
							<Box sx={{ mb: 2 }}>
								<Alert severity="error">{error}</Alert>
							</Box>
						)}

						{/* Form */}
						<Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
							{/* Email or Access Code Field */}
							<Box>
								<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
									<Typography
										component="label"
										htmlFor="email"
										sx={{
											display: 'block',
											fontSize: '0.875rem',
											fontWeight: 500,
											color: 'var(--text-primary)',
										}}
									>
										{isAccessCode ? '8-Character Access Code' : `${t('auth.email')} or Access Code`}
									</Typography>
									{isAccessCode && (
										<Typography
											sx={{
												fontSize: '0.75rem',
												fontWeight: 600,
												color: 'var(--accent-gold)',
												bgcolor: 'rgba(var(--accent-gold-rgb), 0.12)',
												px: 1,
												py: 0.25,
												borderRadius: 1,
											}}
										>
											Access code detected
										</Typography>
									)}
								</Box>
								<TextField
									id="email"
									type="text"
									fullWidth
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									placeholder="Enter email or 8-character code (e.g. C24FBSUX)"
									autoComplete="username"
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												{isAccessCode ? (
													<VpnKey sx={{ fontSize: 20, color: 'var(--accent-gold)' }} />
												) : (
													<Email sx={{ fontSize: 20, color: 'var(--text-secondary)' }} />
												)}
											</InputAdornment>
										),
									}}
									sx={{
										...textFieldStyles,
										...(isAccessCode && {
											'& .MuiOutlinedInput-root input': {
												letterSpacing: '0.18em',
												fontWeight: 700,
												color: 'var(--text-primary)',
											},
										}),
									}}
								/>
							</Box>

							{/* Password Field - Hidden/not required when entering an 8-character access code */}
							{!isAccessCode && (
								<Box>
									<Typography
										component="label"
										htmlFor="password"
										sx={{
											display: 'block',
											fontSize: '0.875rem',
											fontWeight: 500,
											color: 'var(--text-primary)',
											mb: 1,
										}}
									>
										{t('auth.password')}
									</Typography>
									<TextField
										id="password"
										type={showPassword ? 'text' : 'password'}
										fullWidth
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										placeholder="Enter your password"
										autoComplete="current-password"
										InputProps={{
											startAdornment: (
												<InputAdornment position="start">
													<Lock sx={{ fontSize: 20, color: 'var(--text-secondary)' }} />
												</InputAdornment>
											),
											endAdornment: (
												<InputAdornment position="end">
													<IconButton
														onClick={() => setShowPassword(!showPassword)}
														edge="end"
														sx={{
															color: 'var(--accent-gold)',
															'&:hover': {
																color: 'var(--accent-gold)',
															},
														}}
													>
														{showPassword ? (
															<VisibilityOff sx={{ fontSize: 20 }} />
														) : (
															<Visibility sx={{ fontSize: 20 }} />
														)}
													</IconButton>
												</InputAdornment>
											),
										}}
										sx={textFieldStyles}
									/>
								</Box>
							)}

							{/* Submit Button */}
							<Button
								type="submit"
								disabled={isLoading}
								variant="contained"
								size="large"
								endIcon={!isLoading && <ArrowForward />}
								sx={{
									width: '100%',
									background: 'linear-gradient(135deg, var(--accent-gold) 0%, #B8960C 100%)',
									color: 'var(--text-primary)',
									fontWeight: 600,
									py: 1.5,
									fontSize: '1rem',
									boxShadow: '0 4px 14px rgba(var(--accent-gold-rgb), 0.25)',
									'&:hover': {
										background: 'linear-gradient(135deg, var(--accent-gold) 0%, #B8960C 100%)',
										boxShadow: '0 4px 14px rgba(var(--accent-gold-rgb), 0.35)',
									},
									'&:disabled': {
										background: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.55) 0%, rgba(184, 150, 12, 0.55) 100%)',
										color: 'rgba(var(--text-primary-rgb), 0.7)',
									},
								}}
							>
								{isLoading ? (
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
										<CircularProgress size={20} sx={{ color: 'inherit' }} />
										<Typography component="span">{t('auth.signingIn')}</Typography>
									</Box>
								) : (
									<Typography component="span">
										{isAccessCode ? 'Login with Access Code' : t('auth.signIn')}
									</Typography>
								)}
							</Button>
						</Box>

						{/* Sign Up Link */}
						<Box sx={{ textAlign: 'center', pt: 2 }}>
							<Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
								{t('auth.dontHaveAccount')}{' '}
								<Typography
									component="button"
									onClick={() => router.push('/auth/signup')}
									sx={{
										background: 'none',
										border: 'none',
										// Gold-800 from the design token scale: passes AA on white panels (gold-500 is too light for text)
										color: '#8D7A1F',
										fontWeight: 500,
										cursor: 'pointer',
										transition: 'color 0.2s ease',
										'&:hover': {
											color: '#6B5C17',
										},
									}}
								>
									{t('auth.signUp')}
								</Typography>
							</Typography>
						</Box>

						{/* Short Code Login Link */}
						<Box sx={{ textAlign: 'center', pt: 2, mt: 2, borderTop: '1px solid var(--border)' }}>
							<Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 1 }}>
								Have a login code?
							</Typography>
							<DSButton
								variant="outline"
								size="sm"
								onClick={() => router.push(simpleLoginHref)}
								sx={{
									borderColor: 'rgba(var(--accent-gold-rgb), 0.22)',
									color: 'var(--text-primary)',
									'&:hover': {
										borderColor: 'var(--accent-gold)',
										bgcolor: 'rgba(var(--accent-gold-rgb), 0.06)',
									},
								}}
							>
								Login with 8-character code
							</DSButton>
						</Box>
					</Box>
				</Paper>
			</motion.div>
		</Box>
	);
}


