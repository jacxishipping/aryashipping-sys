'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { Alert, Button } from '@/components/design-system';
import {
  Key,
  HelpCircle,
  ArrowRight,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react';
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

      <div className="min-h-screen bg-[#0a0d14] text-white flex items-center justify-center py-8 px-4 relative">
        <div className="max-w-md w-full">
          <div className="p-6 sm:p-8 rounded-3xl bg-[rgba(18,24,38,0.95)] border border-[rgba(212,175,55,0.2)] shadow-2xl backdrop-blur-xl text-center">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <SiteLogo variant="dashboard" className="w-[130px]" priority />
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <Loader2 className="w-9 h-9 animate-spin text-[#D4AF37]" />
                <p className="text-slate-300 text-sm font-medium m-0">
                  {statusMessage}
                </p>
              </div>
            ) : isTelegramEnvironment ? (
              <form onSubmit={handleLinkAccount}>
                <h2 className="font-bold text-white mb-2 text-xl m-0">
                  Connect Jacxi Account
                </h2>

                <p className="text-slate-400 mb-6 text-sm leading-relaxed m-0">
                  {telegramUser?.firstName ? (
                    <>Hello <b className="text-slate-200">{telegramUser.firstName}</b>! </>
                  ) : null}
                  Enter your 8-digit access code to securely link your Telegram and view your shipments.
                </p>

                {errorMessage && (
                  <div className="mb-5 text-left">
                    <Alert severity="error">{errorMessage}</Alert>
                  </div>
                )}

                {successMessage && (
                  <div className="mb-5 text-left">
                    <Alert severity="success">{successMessage}</Alert>
                  </div>
                )}

                <div className="mb-4">
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-[#D4AF37] pointer-events-none">
                      <Key className="w-5 h-5" />
                    </div>
                    <input
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase().slice(0, 8))}
                      placeholder="e.g. 83492019 or JACX1234"
                      disabled={isSubmittingCode || !!successMessage}
                      autoComplete="off"
                      autoFocus
                      className="w-full pl-11 pr-4 py-3 bg-[rgba(15,23,42,0.8)] rounded-xl border border-[rgba(212,175,55,0.3)] text-white text-center font-bold text-lg tracking-[3px] uppercase placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] disabled:opacity-50 transition-colors"
                    />
                  </div>
                </div>

                <Button
                  fullWidth
                  type="submit"
                  disabled={isSubmittingCode || accessCode.trim().length !== 8 || !!successMessage}
                  loading={isSubmittingCode}
                  variant="primary"
                  size="md"
                  icon={!isSubmittingCode ? <ArrowRight className="w-5 h-5" /> : undefined}
                  iconPosition="end"
                >
                  Connect & Enter Portal
                </Button>

                {/* Help button */}
                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => setShowCodeHelp(!showCodeHelp)}
                    className="inline-flex items-center gap-1.5 text-slate-400 hover:text-[#D4AF37] text-xs bg-transparent border-0 cursor-pointer transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Where can I find my access code?</span>
                  </button>
                </div>

                {showCodeHelp && (
                  <div className="mt-4 p-4 rounded-xl bg-[rgba(30,41,59,0.7)] border border-slate-700/50 text-left relative">
                    <button
                      type="button"
                      onClick={() => setShowCodeHelp(false)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="text-[#D4AF37] font-semibold text-xs mb-1">
                      How to get your code:
                    </div>
                    <div className="text-slate-300 text-xs leading-relaxed">
                      1. Check your shipment invoice or booking PDF.<br />
                      2. Or log into the web portal at jacxishipping.com &gt; Profile.<br />
                      3. Your 8-digit code (e.g. <code className="text-[#D4AF37]">83492019</code>) is shown there.
                    </div>
                  </div>
                )}
              </form>
            ) : (
              <div>
                <h2 className="font-bold text-white mb-3 text-lg m-0">
                  Jacxi Shipping Assistant
                </h2>
                <p className="text-slate-400 mb-6 text-sm leading-relaxed m-0">
                  This page is the dedicated launchpad for the Jacxi Shipping Telegram Bot and Mini App.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => window.open('https://t.me/jacxishippingbot', '_blank')}
                    className="w-full py-3 px-4 rounded-xl bg-[#229ED9] hover:bg-[#1e8bc0] text-white font-semibold flex items-center justify-center gap-2 border-0 cursor-pointer transition-colors"
                  >
                    <span>Open in Telegram Bot</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/auth/signin')}
                    className="w-full py-3 px-4 rounded-xl border border-[rgba(212,175,55,0.4)] hover:border-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] text-[#D4AF37] font-semibold bg-transparent cursor-pointer transition-colors"
                  >
                    Standard Portal Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
