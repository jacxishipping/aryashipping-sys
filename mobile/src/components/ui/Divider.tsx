import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Spacing } from '../../constants/spacing';
import { useAppTheme } from '../../hooks/useAppTheme';

interface DividerProps {
  spacing?: number;
}

export const Divider: React.FC<DividerProps> = ({ spacing = Spacing.base }) => {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.divider,
        {
          marginVertical: spacing,
          backgroundColor: colors.border,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  divider: {
    height: 1,
  },
});
