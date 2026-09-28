import React from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { AuthNavigator } from './AuthNavigator';
import { AdminNavigator } from './AdminNavigator';
import { CustomerNavigator } from './CustomerNavigator';
import { Colors } from '../constants/colors';
import { useThemePreference } from '../contexts/ThemePreferenceContext';

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const { colorScheme } = useThemePreference();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const navigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...navigationTheme,
    colors: {
      ...navigationTheme.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.panel,
      border: colors.border,
      text: colors.textPrimary,
      notification: colors.accent,
    },
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <NavigationContainer theme={theme}>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : isAdmin ? (
        <AdminNavigator />
      ) : (
        <CustomerNavigator />
      )}
    </NavigationContainer>
  );
};
