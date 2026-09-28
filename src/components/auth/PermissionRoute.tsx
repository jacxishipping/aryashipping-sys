'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { hasPermission, type Permission } from '@/lib/rbac';

interface PermissionRouteProps {
  children: React.ReactNode;
  permission?: Permission;
  anyOf?: Permission[];
}

function isAllowed(role: string | null | undefined, permission?: Permission, anyOf?: Permission[]) {
  if (anyOf && anyOf.length > 0) {
    return anyOf.some((item) => hasPermission(role, item));
  }

  if (permission) {
    return hasPermission(role, permission);
  }

  return false;
}

export default function PermissionRoute({ children, permission, anyOf }: PermissionRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const allowed = isAllowed(session?.user?.role, permission, anyOf);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated' && !allowed) {
      router.push('/dashboard');
    }
  }, [allowed, router, session, status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}