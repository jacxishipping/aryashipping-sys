import { SearchX } from 'lucide-react';
import { DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, PageHeader } from '@/components/design-system';

export default function PortalNotFound() {
  return (
    <DashboardSurface>
      <PageHeader title="Page not found" description="The portal page you're looking for doesn't exist." />
      <EmptyState
        icon={<SearchX className="w-12 h-12" />}
        title="No page at this address"
        description="Check the URL or return to your partner workspaces."
        action={
          <Button variant="primary" href="/portal">
            Back to workspaces
          </Button>
        }
      />
    </DashboardSurface>
  );
}
