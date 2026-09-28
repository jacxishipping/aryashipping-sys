'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import { BottomNavigation } from '@/components/mobile/BottomNavigation';
import { KeyboardShortcutHelp } from '@/components/design-system';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { Box } from '@mui/material';

import { CommandPaletteProvider } from '@/components/providers/CommandPaletteProvider';
import { LenisWrapperProvider, useLenisWrapper } from '@/components/providers/LenisWrapperProvider';
import { ConfirmActionProvider } from '@/components/ui/ConfirmActionProvider';
import { KeyboardShortcutsModal } from '@/components/dashboard/KeyboardShortcutsModal';
import { WorkspaceTray } from '@/components/dashboard/WorkspaceTray';

// Inner component that uses the Lenis wrapper
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const mainContentRef = useRef<HTMLElement>(null);
  const { registerWrapper, unregisterWrapper } = useLenisWrapper();

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Support mobile menu drawer events (e.g. from mobile bottom navigation)
  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleOpen = () => setMobileOpen(true);
    const handleClose = () => setMobileOpen(false);

    window.addEventListener('toggle-mobile-menu', handleToggle);
    window.addEventListener('open-mobile-menu', handleOpen);
    window.addEventListener('close-mobile-menu', handleClose);

    return () => {
      window.removeEventListener('toggle-mobile-menu', handleToggle);
      window.removeEventListener('open-mobile-menu', handleOpen);
      window.removeEventListener('close-mobile-menu', handleClose);
    };
  }, []);

  // Register the main content area as the scroll container for Lenis
  useEffect(() => {
    if (mainContentRef.current) {
      registerWrapper(mainContentRef.current);
    }
    return () => unregisterWrapper();
  }, [registerWrapper, unregisterWrapper]);

  return (
    <Box
      className="dashboard-surface-root transition-colors duration-200"
      sx={{
        height: '100vh',
        overflow: 'hidden',
        bgcolor: 'var(--background)',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--text-primary)',
      }}
    >
      {/* Header */}
      <Header onMenuClick={() => setMobileOpen(!mobileOpen)} />

      {/* Content Area with Sidebar */}
      <Box
          sx={{
            display: 'flex',
            flexGrow: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
      >
        {/* Sidebar */}
        <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

        {/* Main Content - This is the scroll container for Lenis */}
        <Box
          ref={mainContentRef}
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            minHeight: 0,
            bgcolor: 'var(--background)',
            backgroundImage: 'none',
            overflow: 'auto',
            /* Keep the scroll affordance visible on dense operational pages. */
            '&::-webkit-scrollbar': {
              width: 10,
              height: 10,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(var(--text-primary-rgb), 0.24)',
              border: '3px solid var(--background)',
              borderRadius: 10,
            },
            scrollbarColor: 'rgba(var(--text-primary-rgb), 0.24) var(--background)',
            pb: { xs: 'calc(76px + env(safe-area-inset-bottom, 0px))', lg: 0 },
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation />

      {/* Multitasking Workspace Tray */}
      <WorkspaceTray />

      {/* Global Keyboard Shortcuts Cheat Sheet - Press ? key */}
      <KeyboardShortcutsModal />
    </Box>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ProtectedRoute>
        <CommandPaletteProvider>
          <LenisWrapperProvider>
            <ConfirmActionProvider>
              <DashboardLayoutInner>{children}</DashboardLayoutInner>
            </ConfirmActionProvider>
          </LenisWrapperProvider>
        </CommandPaletteProvider>
      </ProtectedRoute>
    </SessionProvider>
  );
}
