'use client';

import { useState } from 'react';
import { Calculator } from 'lucide-react';
import Modal from '@/components/design-system/Modal';
import ShipmentCalculator from '@/components/dashboard/ShipmentCalculator';
import { Button } from '@/components/design-system';

export default function QuickCalculatorButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        icon={<Calculator className="h-4 w-4" />}
      >
        Rate
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Quick Rate Calculator"
        description="Estimate using current rates"
        size="lg"
      >
        <div className="py-1">
          <ShipmentCalculator />
        </div>
      </Modal>
    </>
  );
}
