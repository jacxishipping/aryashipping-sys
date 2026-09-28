'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewCustomerPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/users/new?accountType=customer');
  }, [router]);

  return null;
}
