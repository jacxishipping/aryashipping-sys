import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Colors } from '../../constants/colors';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AppIcon, AppIconName } from '../shared/AppIcon';

/** Mirrors web StatsCard variants */
export type KPIVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary';

interface DashboardKPIProps {
  title: string;
  value: string | number;
  icon?: AppIconName;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** Controls the icon background colour and accent border. Matches web StatsCard. */
  variant?: KPIVariant;
  onPress?: () => void;
}

function useVariantColors(variant: KPIVariant, colors: typeof Colors.light) {
  switch (variant) {
    case 'success':
      return { iconColor: colors.success, iconBg: `${colors.success}26` };
    case 'warning':
      return { iconColor: colors.warning, iconBg: `${colors.warning}26` };
    case 'error':
      return { iconColor: colors.error, iconBg: `${colors.error}26` };
    case 'info':
      return { iconColor: colors.info, iconBg: `${colors.info}26` };
    case 'secondary':
      return { iconColor: colors.textSecondary, iconBg: `${colors.textSecondary}1A` };
    default: // 'default' — gold accent, matches web
      return { iconColor: colors.accent, iconBg: `${colors.accent}26` };
  }
}

export const DashboardKPI: React.FC<DashboardKPIProps> = ({
  title,
  value,
  icon,
  subtitle,
  trend,
  variant = 'default',
  onPress,
}) => {
  const { colors } = useAppTheme();
  const { iconColor, iconBg } = useVariantColors(variant, colors);

  // Web StatsCard uses a left accent border only for 'default' variant
  const accentBorder = variant === 'default';

  return (
    <Card
      pressable={!!onPress}
      onPress={onPress}
      accentBorder={accentBorder}
      style={styles.card}
    >
      <View style={styles.content}>
        <View style={styles.left}>
          <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
          ) : null}
          {trend ? (
            <View
              style={[
                styles.trendPill,
                {
                  backgroundColor: trend.isPositive ? `${colors.success}14` : `${colors.error}14`,
                  borderColor: trend.isPositive ? `${colors.success}30` : `${colors.error}30`,
                },
              ]}
            >
              <Text style={[styles.trend, { color: trend.isPositive ? colors.success : colors.error }]}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </Text>
            </View>
          ) : null}
        </View>
        {icon ? (
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: iconBg,
                borderColor: `${iconColor}33`,
              },
            ]}
          >
            <AppIcon name={icon} size={20} color={iconColor} />
          </View>
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 120,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  left: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.sm,
  },
  trendPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  trend: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
