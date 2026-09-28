'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
  IconButton,
} from '@mui/material';
import { Alert , FormField } from '@/components/design-system';
import {
  VpnKey,
  HelpOutline,
  ArrowForward,
  Close,
  OpenInNew,
} from '@mui/icons-material';
import SiteLogo from '@/components/brand/SiteLogo';

type TelegramUser = {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
};

export function TelegramAppClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token');
  const targetPath = searchParams.get('target') || '/dashboard';

  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Connecting to Jacxi Shipping...');
  const [isTelegramEnvironment, setIsTelegramEnvironment] = useState(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [initDataString, setInitDataString] = useState<string>('');
  const [accessCode, setAccessCode] = useState('');
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCodeHelp, setShowCodeHelp] = useState(false);

  // Initialize Telegram WebApp or handle direct bridge token
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      // 1. If bridge token is provided in URL, authenticate immediately
      if (urlToken) {
        setStatusMessage('Logging in securely...');
        try {
          const res = await fetch('/api/auth/telegram-bridge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: urlToken, target: targetPath }),
          });

          if (res.ok) {
            if (isMounted) {
              setStatusMessage('Success! Redirecting to dashboard...');
              window.location.href = targetPath;
            }
            return;
          }
        } catch {
          // Token error, continue to Telegram initData detection
        }
      }

      // 2. Check if running inside Telegram WebApp
      const tg = typeof window !== 'undefined' ? (window as unknown as { Telegram?: { WebApp?: { initData?: string; ready?: () => void; expand?: () => void } } }).Telegram?.WebApp : undefined;

      // Also check hash #tgWebAppData
      let rawInitData = tg?.initData || '';
      if (!rawInitData && typeof window !== 'undefined' && window.location.hash.includes('tgWebAppData=')) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          rawInitData = hashParams.get('tgWebAppData') || '';
        } catch {
          // ignore
        }
      }

      if (tg) {
        try {
          tg.ready?.();
          tg.expand?.();
        } catch {
          // ignore
        }
      }

      if (rawInitData) {
        if (isMounted) {
          setIsTelegramEnvironment(true);
          setInitDataString(rawInitData);
          setStatusMessage('Verifying Telegram session...');
        }

        try {
          const res = await fetch('/api/auth/telegram-webapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: rawInitData }),
          });

          const data = await res.json();

          if (isMounted) {
            if (res.ok && data.linked) {
              setStatusMessage(`Welcome back, ${data.user.name || 'Customer'}! Loading your dashboard...`);
              window.location.href = targetPath;
              return;
            }

            if (res.ok && !data.linked) {
              setTelegramUser(data.telegramUser);
              setIsLoading(false);
              return;
            }

            if (!res.ok) {
              setErrorMessage(data.error || 'Failed to verify Telegram session.');
              setIsLoading(false);
            }
          }
        } catch {
          if (isMounted) {
            setErrorMessage('Unable to connect to Jacxi services. Please try again.');
            setIsLoading(false);
          }
        }
      } else {
        // Not in Telegram WebApp
        if (isMounted) {
          setIsTelegramEnvironment(false);
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, [urlToken, targetPath]);

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanCode = accessCode.replace(/[\s\-_]/g, '').trim().toUpperCase();
    if (cleanCode.length !== 8) {
      setErrorMessage('Please enter an 8-character access code (e.g. 83492019 or JACX1234)');
      return;
    }

    setIsSubmittingCode(true);

    try {
      const res = await fetch('/api/auth/telegram-webapp/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: initDataString,
          accessCode: cleanCode,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setSuccessMessage('Account linked successfully! Entering portal...');
        setTimeout(() => {
          window.location.href = targetPath;
        }, 1200);
      } else {
        setErrorMessage(data.error || 'Failed to link account. Please verify your code.');
      }
    } catch {
      setErrorMessage('Network error while linking account. Please try again.');
    } finally {
      setIsSubmittingCode(false);
    }
  };

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />

      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#0a0d14',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          px: 2,
          position: 'relative',
        }}
      >
        <Container maxWidth="xs">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              bgcolor: 'rgba(18, 24, 38, 0.95)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(20px)',
              textAlign: 'center',
            }}
          >
            {/* Logo */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <SiteLogo variant="dashboard" className="w-[130px]" priority />
            </Box>

            {isLoading ? (
              <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 }}>
                <CircularProgress size={36} sx={{ color: '#D4AF37' }} />
                <Typography sx={{ color: '#cbd5e1', fontSize: '0.95rem', fontWeight: 500 }}>
                  {statusMessage}
                </Typography>
              </Box>
            ) : isTelegramEnvironment ? (
              <Box component="form" onSubmit={handleLinkAccount}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: '#ffffff',
                    mb: 1,
                    fontSize: '1.25rem',
                  }}
                >
                  Connect Jacxi Account
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: '#94a3b8',
                    mb: 3,
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                  }}
                >
                  {telegramUser?.firstName ? (
                    <>Hello <b>{telegramUser.firstName}</b>! </>
                  ) : null}
                  Enter your 8-digit access code to securely link your Telegram and view your shipments.
                </Typography>

                {errorMessage && (
                  <Box sx={{ mb: 2.5 }}>
                    <Alert severity="error">{errorMessage}</Alert>
                  </Box>
                )}

                {successMessage && (
                  <Box sx={{ mb: 2.5 }}>
                    <Alert severity="success">{successMessage}</Alert>
                  </Box>
                )}

                <Box sx={{ mb: 2 }}>
                  <FormField
                    fullWidth
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase().slice(0, 8))}
                    placeholder="e.g. 83492019 or JACX1234"
                    disabled={isSubmittingCode || !!successMessage}
                    autoComplete="off"
                    autoFocus leftIcon={<VpnKey sx={{ color: '#D4AF37', fontSize: 20 }} />}  style={{
                        textAlign: 'center',
                        letterSpacing: '3px',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        textTransform: 'uppercase',
                      }} 
                    
                  />
                </Box>

                <Button
                  fullWidth
                  type="submit"
                  disabled={isSubmittingCode || accessCode.trim().length !== 8 || !!successMessage}
                  variant="contained"
                  endIcon={!isSubmittingCode && <ArrowForward />}
                  sx={{
                    py: 1.4,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
                    color: '#0a0d14',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 14px rgba(212, 175, 55, 0.25)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #e6be3e 0%, #c49f12 100%)',
                    },
                    '&:disabled': {
                      background: 'rgba(212, 175, 55, 0.2)',
                      color: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                >
                  {isSubmittingCode ? (
                    <CircularProgress size={22} sx={{ color: '#0a0d14' }} />
                  ) : (
                    'Connect & Enter Portal'
                  )}
                </Button>

                {/* Help button */}
                <Box sx={{ mt: 2.5, textAlign: 'center' }}>
                  <Button
                    size="small"
                    startIcon={<HelpOutline sx={{ fontSize: 16 }} />}
                    onClick={() => setShowCodeHelp(!showCodeHelp)}
                    sx={{
                      color: '#94a3b8',
                      fontSize: '0.8rem',
                      textTransform: 'none',
                      '&:hover': { color: '#D4AF37', bgcolor: 'transparent' },
                    }}
                  >
                    Where can I find my access code?
                  </Button>
                </Box>

                {showCodeHelp && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      borderRadius: 2.5,
                      bgcolor: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      textAlign: 'left',
                      position: 'relative',
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => setShowCodeHelp(false)}
                      sx={{ position: 'absolute', top: 6, right: 6, color: '#94a3b8' }}
                    >
                      <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                    <Typography sx={{ color: '#D4AF37', fontWeight: 600, fontSize: '0.85rem', mb: 0.5 }}>
                      How to get your code:
                    </Typography>
                    <Typography sx={{ color: '#cbd5e1', fontSize: '0.8rem', lineHeight: 1.5 }}>
                      1. Check your shipment invoice or booking PDF.<br />
                      2. Or log into the web portal at jacxishipping.com &gt; Profile.<br />
                      3. Your 8-digit code (e.g. <code>83492019</code>) is shown there.
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff', mb: 1.5 }}>
                  Jacxi Shipping Assistant
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3, lineHeight: 1.6 }}>
                  This page is the dedicated launchpad for the Jacxi Shipping Telegram Bot and Mini App.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    endIcon={<OpenInNew />}
                    onClick={() => window.open('https://t.me/jacxishippingbot', '_blank')}
                    sx={{
                      py: 1.3,
                      borderRadius: 3,
                      bgcolor: '#229ED9',
                      color: '#ffffff',
                      fontWeight: 600,
                      '&:hover': { bgcolor: '#1e8bc0' },
                    }}
                  >
                    Open in Telegram Bot
                  </Button>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => router.push('/auth/signin')}
                    sx={{
                      py: 1.3,
                      borderRadius: 3,
                      borderColor: 'rgba(212, 175, 55, 0.4)',
                      color: '#D4AF37',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: '#D4AF37',
                        bgcolor: 'rgba(212, 175, 55, 0.08)',
                      },
                    }}
                  >
                    Standard Portal Login
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
    </>
  );
}
