'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
	const router = useRouter();

	useEffect(() => {
		// Let the dashboard protection enforce authentication after redirect.
		router.replace('/dashboard/customers/new');
	}, [router]);

	// Show loading while redirecting
	return (
		<div className="min-h-screen bg-[var(--text-primary)] flex items-center justify-center">
			<div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/30 border-t-cyan-400"></div>
		</div>
	);
}
