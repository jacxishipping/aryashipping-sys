import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';
import { useAppTheme } from '../../hooks/useAppTheme';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', size = 'md', style }) => {
  const { colors } = useAppTheme();

  const getVariantColor = () => {
    switch (variant) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      case 'info':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const getSize = () => {
    switch (size) {
      case 'sm':
        return {
          paddingVertical: Spacing.xs,
          paddingHorizontal: Spacing.sm,
          fontSize: Typography.fontSize.xs,
        };
      case 'md':
        return {
          paddingVertical: Spacing.xs,
          paddingHorizontal: Spacing.md,
          fontSize: Typography.fontSize.sm,
        };
    }
  };

  const color = getVariantColor();
  const sizeStyle = getSize();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${color}20`,
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color,
            fontSize: sizeStyle.fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: Typography.fontWeight.semibold,
  },
});
