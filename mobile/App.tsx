import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './src/hooks/useAuth';
import { ThemePreferenceProvider, useThemePreference } from './src/contexts/ThemePreferenceContext';
import { RootNavigator } from './src/navigation';
import 'react-native-reanimated';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { loadSession } = useAuth();
  const { colorScheme } = useThemePreference();

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <RootNavigator />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemePreferenceProvider>
      <AppContent />
    </ThemePreferenceProvider>
  );
}
