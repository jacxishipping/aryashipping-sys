import { SearchX } from 'lucide-react';
import { Button, EmptyState } from '@/components/design-system';

export default function RootNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-6">
      <div className="max-w-[560px] w-full">
        <EmptyState
          icon={<SearchX className="w-12 h-12" />}
          title="Page not found"
          description="The page you're looking for doesn't exist or was moved."
          action={
            <div className="flex gap-2 flex-wrap justify-center">
              <Button variant="primary" href="/">
                Back to home
              </Button>
              <Button variant="outline" href="/dashboard">
                Go to dashboard
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}
