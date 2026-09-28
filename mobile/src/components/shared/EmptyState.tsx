import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { AppIcon, AppIconName, isAppIconName } from './AppIcon';

interface EmptyStateProps {
  icon?: AppIconName | string;
  title: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'shipments',
  title,
  description,
}) => {
  const { colors } = useAppTheme();
  const semanticIcon = typeof icon === 'string' && isAppIconName(icon) ? icon : null;

  return (
    <View style={styles.container}>
      {semanticIcon ? (
        <View style={[styles.iconBadge, { backgroundColor: colors.accentSoft, borderColor: `${colors.accent}30` }]}> 
          <AppIcon name={semanticIcon} size={36} color={colors.accent} />
        </View>
      ) : (
        <Text style={styles.icon}>{icon}</Text>
      )}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  iconBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
  },
});
