'use client';

import { createContext, useContext, useRef, ReactNode } from 'react';

interface LenisWrapperContextType {
  wrapperRef: React.RefObject<HTMLElement | null>;
  registerWrapper: (element: HTMLElement | null) => void;
  unregisterWrapper: () => void;
}

const LenisWrapperContext = createContext<LenisWrapperContextType | null>(null);

export function LenisWrapperProvider({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLElement | null>(null);

  const registerWrapper = (element: HTMLElement | null) => {
    wrapperRef.current = element;
  };

  const unregisterWrapper = () => {
    wrapperRef.current = null;
  };

  return (
    <LenisWrapperContext.Provider value={{ wrapperRef, registerWrapper, unregisterWrapper }}>
      {children}
    </LenisWrapperContext.Provider>
  );
}

export function useLenisWrapper() {
  const context = useContext(LenisWrapperContext);
  if (!context) {
    throw new Error('useLenisWrapper must be used within a LenisWrapperProvider');
  }
  return context;
}