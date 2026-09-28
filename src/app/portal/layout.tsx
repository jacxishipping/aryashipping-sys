'use client';

import { SessionProvider } from '@/components/providers/SessionProvider';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PortalWorkspaceShell from '@/components/partner-portals/PortalWorkspaceShell';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ProtectedRoute>
        <PortalWorkspaceShell>{children}</PortalWorkspaceShell>
      </ProtectedRoute>
    </SessionProvider>
  );
}