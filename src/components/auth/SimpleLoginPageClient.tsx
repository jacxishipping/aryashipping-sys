'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Visibility, VisibilityOff, VpnKey, ArrowForward, LoginOutlined } from '@mui/icons-material';
import {
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Paper,
} from '@mui/material';
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
			<Box
				sx={{
					minHeight: '100vh',
					bgcolor: 'var(--background)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					py: { xs: 6, sm: 10 },
					px: { xs: 2, sm: 3, lg: 4 },
				}}
			>
				<motion.div
					// Start visible so SSR HTML is never blank; animation only from a small offset
					initial={{ opacity: 1, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					style={{ maxWidth: 448, width: '100%', position: 'relative', zIndex: 10 }}
				>
					<Paper
						elevation={0}
						sx={{
							position: 'relative',
							borderRadius: 4,
							background: 'var(--panel)',
							border: '1px solid rgba(var(--panel-rgb), 0.9)',
							boxShadow: '0 25px 60px rgba(var(--text-primary-rgb), 0.12)',
							p: { xs: 4, sm: 5 },
							overflow: 'hidden',
						}}
					>
						<Box sx={{ position: 'relative', zIndex: 1 }}>
							<Box sx={{ textAlign: 'center', mb: 3 }}>
								<Typography
									variant="h3"
									sx={{
										fontSize: { xs: '1.875rem', sm: '2.25rem' },
										fontWeight: 700,
										color: 'var(--text-primary)',
										mb: 1,
									}}
								>
									Login With Code
								</Typography>
								<Typography
									variant="body1"
									sx={{
										color: 'var(--text-secondary)',
									}}
								>
									Enter your 8-character access code to continue.
								</Typography>
							</Box>

							{error && (
								<Alert
									severity="error"
									sx={{
										mb: 2,
										bgcolor: 'rgba(var(--error-rgb), 0.15)',
										border: '1px solid rgba(var(--error-rgb), 0.4)',
										color: 'var(--error)',
										'& .MuiAlert-icon': {
											color: 'var(--error)',
										},
									}}
								>
									{error}
								</Alert>
							)}

							<Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
								<Box>
									<Typography
										component="label"
										htmlFor="loginCode"
										sx={{
											display: 'block',
											fontSize: '0.875rem',
											fontWeight: 500,
											color: 'var(--text-primary)',
											mb: 1,
										}}
									>
										8-Character Code
									</Typography>
									<TextField
										id="loginCode"
										type={showCode ? 'text' : 'password'}
										fullWidth
										value={loginCode}
										onChange={handleCodeChange}
										required
										placeholder="Enter your 8-character code"
										autoComplete="off"
										autoFocus
										InputProps={{
											startAdornment: (
												<InputAdornment position="start">
													<VpnKey sx={{ fontSize: 20, color: 'var(--text-secondary)' }} />
												</InputAdornment>
											),
											endAdornment: (
												<InputAdornment position="end">
													<IconButton
														onClick={() => setShowCode(!showCode)}
														edge="end"
														sx={{
															color: 'var(--accent-gold)',
															'&:hover': {
																color: 'var(--accent-gold)',
															},
														}}
													>
														{showCode ? (
															<VisibilityOff sx={{ fontSize: 20 }} />
														) : (
															<Visibility sx={{ fontSize: 20 }} />
														)}
													</IconButton>
												</InputAdornment>
											),
										}}
										sx={{
											'& .MuiOutlinedInput-root': {
												bgcolor: 'var(--background)',
												borderRadius: 2,
												color: 'var(--text-primary)',
												'& fieldset': {
													borderColor: 'rgba(var(--panel-rgb), 0.9)',
												},
												'&:hover fieldset': {
													borderColor: 'var(--panel)',
												},
												'&.Mui-focused fieldset': {
													borderColor: 'var(--accent-gold)',
													borderWidth: 2,
												},
												'& input': {
													color: 'var(--text-primary)',
													letterSpacing: '0.28em',
													fontWeight: 600,
													textAlign: 'center',
													'&::placeholder': {
														letterSpacing: 'normal',
														color: 'var(--text-secondary)',
														opacity: 1,
													},
												},
											},
										}}
									/>
								</Box>

								<Button
									type="submit"
									disabled={isLoading || loginCode.length !== 8}
									variant="contained"
									size="large"
									endIcon={!isLoading && <ArrowForward />}
									sx={{
										width: '100%',
										bgcolor: 'var(--accent-gold)',
										color: 'var(--background)',
										fontWeight: 600,
										py: 1.5,
										fontSize: '1rem',
										'&:hover': {
											bgcolor: 'var(--accent-gold)',
										},
										'&:disabled': {
											bgcolor: 'rgba(var(--accent-gold-rgb), 0.5)',
											color: 'rgba(var(--background-rgb), 0.85)',
										},
									}}
								>
									{isLoading ? (
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
											<CircularProgress size={20} sx={{ color: 'var(--background)' }} />
											<Typography component="span">Signing in...</Typography>
										</Box>
									) : (
										<Typography component="span">Login with Code</Typography>
									)}
								</Button>
							</Box>

							<Box sx={{ textAlign: 'center', pt: 2, mt: 2, borderTop: '1px solid var(--border)' }}>
								<Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 1 }}>
									Prefer email and password?
								</Typography>
								<Typography
									component="button"
									type="button"
									onClick={() => router.push('/auth/signin')}
									sx={{
										background: 'none',
										border: 'none',
										color: 'var(--accent-gold)',
										fontWeight: 500,
										cursor: 'pointer',
										fontSize: '0.875rem',
										textDecoration: 'underline',
										transition: 'color 0.2s ease',
										'&:hover': {
											color: 'var(--accent-gold)',
										},
									}}
								>
									Back to Sign In
								</Typography>
							</Box>
						</Box>
					</Paper>
				</motion.div>
			</Box>
		);
	}

	return (
		<Box
			sx={{
				minHeight: '100vh',
				background: `radial-gradient(circle at top left, rgba(${brand.accentRgb},0.22), transparent 26%), radial-gradient(circle at 82% 18%, rgba(${brand.accentRgb},0.12), transparent 22%), linear-gradient(180deg, #f8fafc 0%, #eef2f7 50%, #ffffff 100%)`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				py: { xs: 6, sm: 10 },
				px: { xs: 2, sm: 3, lg: 4 },
			}}
		>
			<motion.div
				// Start visible so SSR HTML is never blank; animation only from a small offset
				initial={{ opacity: 1, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				style={{ maxWidth: 560, width: '100%', position: 'relative', zIndex: 10 }}
			>
				<Paper
					elevation={0}
					sx={{
						position: 'relative',
						borderRadius: 5,
						background: 'rgba(255,255,255,0.9)',
						backdropFilter: 'blur(18px)',
						border: '1px solid rgba(255,255,255,0.85)',
						boxShadow: '0 30px 80px rgba(var(--text-primary-rgb), 0.14)',
						p: { xs: 4, sm: 6 },
						overflow: 'hidden',
					}}
				>
					<Box sx={{ position: 'absolute', inset: 'auto -10% -26% auto', width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, rgba(${brand.accentRgb},0.24), rgba(${brand.accentRgb},0.02) 70%, transparent 75%)` }} />
					<Box sx={{ position: 'relative', zIndex: 1 }}>
						<Box sx={{ textAlign: 'center', mb: 4.5, display: 'grid', gap: 1.4 }}>
							<Box sx={{ display: 'flex', justifyContent: 'center' }}>
								{brand.logoUrl ? (
									<Box component="img" src={brand.logoUrl} alt={`${brand.companyLabel} logo`} sx={{ width: 84, height: 84, borderRadius: 4, objectFit: 'cover', bgcolor: 'rgba(255,255,255,0.92)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 18px 34px rgba(15,23,42,0.12)' }} />
								) : (
									<Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 84, height: 84, borderRadius: 4, bgcolor: `rgba(${brand.accentRgb}, 0.14)`, color: brand.accentColor, boxShadow: `0 16px 32px rgba(${brand.accentRgb},0.16)` }}>
										<VpnKey sx={{ fontSize: 40, color: brand.accentColor }} />
									</Box>
								)}
							</Box>
							<Typography sx={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: brand.accentColor }}>
								{portal ? `${brand.companyLabel} Portal` : 'Customer Login'}
							</Typography>
							<Typography
								variant="h3"
								sx={{
									fontSize: { xs: '2.2rem', sm: '2.9rem' },
									fontWeight: 800,
									color: 'var(--text-primary)',
									letterSpacing: '-0.04em',
									lineHeight: 0.95,
								}}
							>
								{portal ? `Access ${brand.companyLabel}` : 'Enter Your Login Code'}
							</Typography>
							<Typography
								variant="body1"
								sx={{
									color: 'var(--text-secondary)',
									fontSize: '1.02rem',
									lineHeight: 1.75,
									maxWidth: 420,
									mx: 'auto',
								}}
							>
								{portal
									? 'Use the 8-character code shared by your portal team to open your branded customer workspace.'
									: 'Enter your 8-character login code to open your customer workspace.'}
							</Typography>
						</Box>

						{error && (
							<Alert
								severity="error"
								sx={{
									mb: 3,
									bgcolor: 'rgba(var(--error-rgb), 0.15)',
									border: '1px solid rgba(var(--error-rgb), 0.4)',
									color: 'var(--error)',
									fontSize: '1rem',
									'& .MuiAlert-icon': {
										color: 'var(--error)',
										fontSize: 24,
									},
								}}
							>
								{error}
							</Alert>
						)}

						<Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
							<Box>
								<Typography component="label" htmlFor="loginCode" sx={{ display: 'block', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', mb: 1.5 }}>
									Login Code
								</Typography>
								<TextField
									id="loginCode"
									type={showCode ? 'text' : 'password'}
									fullWidth
									value={loginCode}
									onChange={handleCodeChange}
									required
									placeholder="Enter 8-character code"
									autoComplete="off"
									autoFocus
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<VpnKey sx={{ fontSize: 24, color: brand.accentColor }} />
											</InputAdornment>
										),
										endAdornment: (
											<InputAdornment position="end">
												<IconButton
													onClick={() => setShowCode(!showCode)}
													edge="end"
													sx={{ color: brand.accentColor }}
												>
													{showCode ? <VisibilityOff sx={{ fontSize: 24 }} /> : <Visibility sx={{ fontSize: 24 }} />}
												</IconButton>
											</InputAdornment>
										),
										sx: {
											fontSize: '1.5rem',
											fontWeight: 600,
											letterSpacing: '0.22em',
											textAlign: 'center',
										},
									}}
									sx={{
										'& .MuiOutlinedInput-root': {
											bgcolor: 'rgba(255,255,255,0.88)',
											borderRadius: 3.5,
											color: 'var(--text-primary)',
											fontSize: '1.5rem',
											py: 1,
											'& fieldset': {
												borderColor: `rgba(${brand.accentRgb}, 0.2)`,
												borderWidth: 2,
											},
											'&:hover fieldset': {
												borderColor: brand.accentColor,
											},
											'&.Mui-focused fieldset': {
												borderColor: brand.accentColor,
												borderWidth: 3,
											},
											'& input': {
												color: 'var(--text-primary)',
												textAlign: 'center',
												letterSpacing: '0.3em',
												fontSize: '1.5rem',
												fontWeight: 700,
												'&::placeholder': {
													color: 'var(--text-secondary)',
													opacity: 0.7,
													letterSpacing: 'normal',
													textAlign: 'center',
													fontSize: '1rem',
												},
											},
										},
									}}
								/>
								<Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
									{loginCode.length}/8 characters
								</Typography>
							</Box>

							<Button
								type="submit"
								disabled={isLoading || loginCode.length !== 8}
								variant="contained"
								size="large"
								endIcon={!isLoading && <ArrowForward />}
								sx={{
									width: '100%',
									background: `linear-gradient(135deg, ${brand.accentColor}, rgba(${brand.accentRgb},0.82))`,
									color: '#ffffff',
									fontWeight: 800,
									py: 2,
									fontSize: '1.125rem',
									borderRadius: 3.5,
									boxShadow: `0 18px 36px rgba(${brand.accentRgb},0.28)`,
									'&:hover': {
										background: `linear-gradient(135deg, ${brand.accentColor}, rgba(${brand.accentRgb},0.88))`,
										transform: 'translateY(-1px)',
									},
									'&:disabled': {
										background: `rgba(${brand.accentRgb}, 0.45)`,
										color: 'rgba(255,255,255,0.88)',
									},
									transition: 'all 0.2s ease',
								}}
							>
								{isLoading ? (
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
										<CircularProgress size={24} sx={{ color: '#ffffff' }} />
										<Typography component="span" sx={{ fontWeight: 800 }}>Logging in...</Typography>
									</Box>
								) : (
									<Typography component="span" sx={{ fontWeight: 800 }}>Open Portal</Typography>
								)}
							</Button>
						</Box>

						<Box sx={{ textAlign: 'center', pt: 4, mt: 4, borderTop: `1px solid rgba(${brand.accentRgb}, 0.14)`, display: 'grid', gap: 1.25 }}>
							<Typography variant="body2" sx={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
								Prefer email and password instead?
							</Typography>
							<Link href={staffLoginHref} style={{ textDecoration: 'none' }}>
								<Button
									variant="outlined"
									size="large"
									startIcon={<LoginOutlined />}
									sx={{
										borderColor: `rgba(${brand.accentRgb}, 0.26)`,
										color: brand.accentColor,
										borderRadius: 3,
										'&:hover': {
											borderColor: brand.accentColor,
											backgroundColor: `rgba(${brand.accentRgb},0.06)`,
										},
									}}
								>
									Sign In With Email
								</Button>
							</Link>
						</Box>
					</Box>
				</Paper>
			</motion.div>
		</Box>
	);
}