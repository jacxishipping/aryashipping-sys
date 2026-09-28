import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';
import * as secureStorage from '../utils/secureStorage';

declare const document: {
  documentElement: {
    style: {
      colorScheme: string;
    };
  };
} | undefined;

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  colorScheme: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => Promise<void>;
  isLoaded: boolean;
};

const THEME_PREFERENCE_KEY = 'theme_preference';

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | undefined>(undefined);

const appearanceController = Appearance as typeof Appearance & {
  setColorScheme?: (colorScheme: ColorSchemeName | null) => void;
};

function applyColorSchemePreference(preference: ThemePreference, systemScheme: 'light' | 'dark') {
  appearanceController.setColorScheme?.(preference === 'system' ? null : preference);

  if (typeof document !== 'undefined') {
    document.documentElement.style.colorScheme = preference === 'system' ? systemScheme : preference;
  }
}

export const ThemePreferenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  const resolvedColorScheme = preference === 'system'
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : preference;

  useEffect(() => {
    let cancelled = false;

    const loadPreference = async () => {
      try {
        const storedPreference = await secureStorage.getItem(THEME_PREFERENCE_KEY);

        if (!cancelled && (storedPreference === 'system' || storedPreference === 'light' || storedPreference === 'dark')) {
          setPreferenceState(storedPreference);
        }
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    };

    void loadPreference();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applyColorSchemePreference(preference, systemColorScheme === 'dark' ? 'dark' : 'light');
  }, [preference, systemColorScheme]);

  const setPreference = async (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    await secureStorage.setItem(THEME_PREFERENCE_KEY, nextPreference);
  };

  const value = useMemo(
    () => ({
      preference,
      colorScheme: resolvedColorScheme,
      setPreference,
      isLoaded,
    }),
    [isLoaded, preference, resolvedColorScheme],
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
};

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);

  if (!context) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  }

  return context;
}