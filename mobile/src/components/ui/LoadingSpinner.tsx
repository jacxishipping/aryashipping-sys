import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color,
  fullScreen = false,
}) => {
  const { colors } = useAppTheme();
  const spinnerColor = color || colors.accent;

  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator size={size} color={spinnerColor} />
      </View>
    );
  }

  return <ActivityIndicator size={size} color={spinnerColor} />;
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
