import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { triggerImpact } from '../../utils/haptics';
import { useAppTheme } from '../../hooks/useAppTheme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
    void triggerImpact('light');
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      void triggerImpact('medium');
      onPress();
    }
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      overflow: 'hidden',
    };

    const sizeStyles: Record<string, ViewStyle> = {
      sm: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.base,
        minHeight: 38,
      },
      md: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        minHeight: 46,
      },
      lg: {
        paddingVertical: Spacing.base,
        paddingHorizontal: Spacing.xl,
        minHeight: 54,
      },
    };

    const variantStyles: Record<string, ViewStyle> = {
      primary: {
        backgroundColor: colors.accent,
        borderWidth: 1,
        borderColor: `${colors.accentDark}55`,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        elevation: 4,
      },
      secondary: {
        backgroundColor: colors.panel,
        borderWidth: 1,
        borderColor: colors.border,
      },
      danger: {
        backgroundColor: colors.error,
        borderWidth: 1,
        borderColor: `${colors.error}66`,
      },
      ghost: {
        backgroundColor: colors.accentSoft,
      },
    };

    if (disabled || loading) {
      return {
        ...baseStyle,
        ...sizeStyles[size],
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: 0.65,
      };
    }

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: '100%' }),
    };
  };

  const getTextStyle = (): TextStyle => {
    const sizeStyles: Record<string, TextStyle> = {
      sm: {
        fontSize: Typography.fontSize.sm,
      },
      md: {
        fontSize: Typography.fontSize.base,
      },
      lg: {
        fontSize: Typography.fontSize.lg,
      },
    };

    const variantStyles: Record<string, TextStyle> = {
      primary: {
        color: colors.textPrimary,
      },
      secondary: {
        color: colors.textPrimary,
      },
      danger: {
        color: colors.panel,
      },
      ghost: {
        color: colors.accent,
      },
    };

    return {
      fontWeight: Typography.fontWeight.semibold,
      letterSpacing: 0.2,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[animatedStyle, getButtonStyle(), style]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.textPrimary : colors.accent}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </AnimatedTouchable>
  );
};
