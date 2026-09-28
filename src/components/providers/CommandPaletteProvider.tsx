'use client';

import { useState } from 'react';
import { CommandPalette } from '@/components/ui/CommandPalette';

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
