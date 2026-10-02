"use client";

import { CompactSkeleton } from './PageSkeletons';

interface LoadingStateProps {
	message?: string;
	fullScreen?: boolean;
}

export default function LoadingState({ message = 'Loading...', fullScreen = false }: LoadingStateProps) {
	if (fullScreen) {
		return (
			<div className="min-h-screen w-full bg-[var(--background)]">
				<div className="p-8 max-w-4xl mx-auto pt-20">
					<CompactSkeleton />
					<div className="mt-8">
						<CompactSkeleton />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full min-h-[200px] flex flex-col items-center justify-center">
			<div className="w-full max-w-md">
				<CompactSkeleton />
			</div>
			{message && message !== 'Loading...' && (
				<p className="text-xs text-[var(--text-secondary)] mt-4">
					{message}
				</p>
			)}
		</div>
	);
}
