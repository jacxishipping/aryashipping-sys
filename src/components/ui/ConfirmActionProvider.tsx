'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { ConfirmDialog } from '@/components/design-system';

type ConfirmSeverity = 'info' | 'warning' | 'error';

type ConfirmOptions = {
  message: ReactNode;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  severity?: ConfirmSeverity;
};

type ResolvedConfirmOptions = Required<Omit<ConfirmOptions, 'message'>> & {
  message: ReactNode;
};

const DEFAULTS: Omit<ResolvedConfirmOptions, 'message'> = {
  title: 'Are you sure?',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  severity: 'warning',
};

type ConfirmContextValue = {
  /**
   * Opens a branded confirmation dialog and resolves to whether the user
   * confirmed. Mirrors the ergonomics of the native `confirm()` so call
   * sites read the same: `if (!(await confirmAction({ message }))) return;`
   */
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirmAction(): ConfirmContextValue['confirmAction'] {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirmAction must be used within a ConfirmActionProvider');
  }
  return context.confirmAction;
}

export function ConfirmActionProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ResolvedConfirmOptions>({
    ...DEFAULTS,
    message: '',
  });
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirmAction = useCallback((nextOptions: ConfirmOptions) => {
    // If a dialog is somehow already open, resolve it as dismissed first.
    resolverRef.current?.(false);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions({
        ...DEFAULTS,
        ...nextOptions,
      });
      setIsOpen(true);
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolverRef.current?.(true);
    resolverRef.current = null;
  }, []);

  const value = useMemo(() => ({ confirmAction }), [confirmAction]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        severity={options.severity}
      />
    </ConfirmContext.Provider>
  );
}
