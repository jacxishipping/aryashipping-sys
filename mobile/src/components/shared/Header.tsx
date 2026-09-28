import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AppIcon, AppIconName } from './AppIcon';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: {
    icon: AppIconName;
    onPress: () => void;
  };
  rightAction?: {
    icon: AppIconName;
    onPress: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, leftAction, rightAction }) => {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.panel, borderBottomColor: colors.border }]}
    >
      <View style={styles.content}>
        {leftAction && (
          <TouchableOpacity onPress={leftAction.onPress} style={[styles.action, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <AppIcon name={leftAction.icon} size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          )}
        </View>
        {rightAction && (
          <TouchableOpacity onPress={rightAction.onPress} style={[styles.action, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <AppIcon name={rightAction.icon} size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    minHeight: 60,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.xs,
  },
  action: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
