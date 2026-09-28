import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';
import Animated, {
  SlideInDown,
  SlideOutUp,
} from 'react-native-reanimated';
import { useAppTheme } from '../../hooks/useAppTheme';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  visible: boolean;
  duration?: number;
  onHide?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  visible,
  duration = 3000,
  onHide,
}) => {
  const { colors } = useAppTheme();

  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        onHide?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      case 'info':
        return colors.info;
      default:
        return colors.panel;
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(300).springify()}
      exiting={SlideOutUp.duration(200)}
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
        },
      ]}
    >
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: Spacing.base,
    right: Spacing.base,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  message: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
});
