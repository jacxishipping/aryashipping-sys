import { SearchX } from 'lucide-react';
import { DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, PageHeader } from '@/components/design-system';

export default function DashboardNotFound() {
  return (
    <DashboardSurface>
      <PageHeader title="Page not found" description="The dashboard page you're looking for doesn't exist." />
      <EmptyState
        icon={<SearchX className="w-12 h-12" />}
        title="No page at this address"
        description="Check the URL or return to the dashboard overview."
        action={
          <Button variant="primary" href="/dashboard">
            Back to dashboard
          </Button>
        }
      />
    </DashboardSurface>
  );
}
